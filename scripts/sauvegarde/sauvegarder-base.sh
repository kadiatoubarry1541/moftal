#!/usr/bin/env bash
# Sauvegarde complète des bases Moftal (Neon) — lancée chaque nuit par
# .github/workflows/sauvegarde-base.yml, ou à la main.
#
# Pour chaque base :
#   1. copie complète (pg_dump, format compressé) ;
#   2. chiffrement si SAUVEGARDE_CLE est fournie (AES-256) ;
#   3. envoi sur IDrive (privé) et, si configuré, sur un 2e stockage (R2 privé) ;
#   4. VÉRIFICATION : la copie est restaurée dans une base vide et comparée à
#      l'originale (mêmes tables). Une copie qui ne se restaure pas = échec,
#      et GitHub envoie un e-mail.
#   5. on ne garde que 35 jours de copies quotidiennes, plus une copie par mois
#      pendant 1 an. Rien n'est supprimé si la copie du jour a échoué.
#
# Variables :
#   BASES                  « nom=url » séparés par des espaces (ex. « principale=postgres://… »)
#   VERIF_URL              base PostgreSQL vide servant à vérifier la restauration
#   SAUVEGARDE_CLE         (facultatif) mot de passe de chiffrement — À GARDER PRÉCIEUSEMENT
#   IDRIVE_ENDPOINT, IDRIVE_REGION, IDRIVE_ACCESS_KEY, IDRIVE_SECRET_KEY, IDRIVE_BUCKET
#   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_SAUVEGARDES (facultatif)
#   DESTINATION_LOCALE     (tests) dossier local à la place des stockages en ligne
set -euo pipefail
set -f   # pas d'expansion de « ? » ou « * » dans les adresses

DATE="$(date -u +%Y-%m-%d)"
HEURE="$(date -u +%H%M)"
JOUR="$(date -u +%d)"
TRAVAIL="$(mktemp -d)"
trap 'rm -rf "$TRAVAIL"' EXIT
GARDER_JOURS=35
GARDER_MOIS=12
ECHECS=0
RESUME="${GITHUB_STEP_SUMMARY:-/dev/null}"

log() { echo "[$(date -u +%H:%M:%S)] $*"; }

: "${BASES:?BASES manquant (ex. principale=postgres://...)}"
# Pas encore configuré (aucune adresse de base fournie) : on prévient sans échouer,
# pour ne pas envoyer un e-mail d'erreur chaque nuit avant la mise en place.
if ! printf '%s\n' $BASES | grep -qE '^[^=]+=.+'; then
  echo "::warning::Sauvegarde NON configurée : ajoutez le secret NEON_DATABASE_URL (voir docs/SAUVEGARDE_ET_RESTAURATION.md)."
  echo "## ⚠️ Sauvegarde non configurée — ajoutez les secrets (docs/SAUVEGARDE_ET_RESTAURATION.md)" >> "${GITHUB_STEP_SUMMARY:-/dev/null}"
  exit 0
fi
: "${VERIF_URL:?VERIF_URL manquant (base vide pour vérifier la restauration)}"

# ── Stockages ────────────────────────────────────────────────────────────────
destinations() {
  if [ -n "${DESTINATION_LOCALE:-}" ]; then echo local; return; fi
  [ -n "${IDRIVE_ACCESS_KEY:-}" ] && echo idrive
  [ -n "${R2_BUCKET_SAUVEGARDES:-}" ] && [ -n "${R2_ACCESS_KEY_ID:-}" ] && echo r2
  true
}

s3() { # s3 <destination> <arguments aws s3…>
  local dest="$1"; shift
  case "$dest" in
    idrive)
      AWS_ACCESS_KEY_ID="$IDRIVE_ACCESS_KEY" AWS_SECRET_ACCESS_KEY="$IDRIVE_SECRET_KEY" \
      AWS_DEFAULT_REGION="${IDRIVE_REGION:-eu-west-4}" \
        aws s3 --endpoint-url "${IDRIVE_ENDPOINT:-https://s3.eu-west-4.idrivee2.com}" "$@" ;;
    r2)
      AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
      AWS_DEFAULT_REGION=auto \
        aws s3 --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com" "$@" ;;
  esac
}
seau() { case "$1" in idrive) echo "${IDRIVE_BUCKET:-moftal-backup}" ;; r2) echo "$R2_BUCKET_SAUVEGARDES" ;; esac; }

envoyer() { # envoyer <destination> <fichier> <chemin>
  local dest="$1" fichier="$2" chemin="$3"
  if [ "$dest" = local ]; then
    mkdir -p "$DESTINATION_LOCALE/$(dirname "$chemin")"; cp "$fichier" "$DESTINATION_LOCALE/$chemin"
  else
    s3 "$dest" cp --only-show-errors "$fichier" "s3://$(seau "$dest")/$chemin"
  fi
}

lister() { # lister <destination> <dossier>  → noms de fichiers
  local dest="$1" dossier="$2"
  if [ "$dest" = local ]; then
    ls -1 "$DESTINATION_LOCALE/$dossier" 2>/dev/null || true
  else
    s3 "$dest" ls "s3://$(seau "$dest")/$dossier/" 2>/dev/null | awk '{print $4}' || true
  fi
}

supprimer() { # supprimer <destination> <chemin>
  local dest="$1" chemin="$2"
  if [ "$dest" = local ]; then rm -f "$DESTINATION_LOCALE/$chemin"
  else s3 "$dest" rm --only-show-errors "s3://$(seau "$dest")/$chemin"; fi
}

# Garde les GARDER copies les plus récentes d'un dossier (noms datés AAAA-MM-JJ…)
nettoyer() { # nettoyer <destination> <dossier> <garder>
  local dest="$1" dossier="$2" garder="$3"
  lister "$dest" "$dossier" | { grep -E '^[0-9]{4}-[0-9]{2}-[0-9]{2}' || true; } | sort -r | tail -n +"$((garder + 1))" |
    while read -r nom; do log "  ancienne copie supprimée : $dossier/$nom"; supprimer "$dest" "$dossier/$nom"; done
}

# Connexion directe (le « pooler » de Neon ne convient pas à pg_dump)
url_directe() { echo "$1" | sed -E 's/-pooler\././'; }

nb_tables() { psql "$1" -XAtqc "SELECT count(*) FROM information_schema.tables WHERE table_type='BASE TABLE' AND table_schema NOT IN ('pg_catalog','information_schema')"; }

DESTS="$(destinations)"
[ -n "$DESTS" ] || { echo "Aucun stockage configuré (IDrive ou R2) : sauvegarde impossible." >&2; exit 1; }
echo "## Sauvegarde des bases Moftal — $DATE" >> "$RESUME"
if [ -z "${SAUVEGARDE_CLE:-}" ]; then
  log "⚠️  SAUVEGARDE_CLE absente : copies NON chiffrées (stockage privé seulement)."
  echo "- ⚠️ Copies **non chiffrées** : ajoutez le secret SAUVEGARDE_CLE" >> "$RESUME"
fi

declare -A DEJA_VUES=()
for entree in $BASES; do
  nom="${entree%%=*}"; url="${entree#*=}"
  [ -n "$url" ] || { log "$nom : pas d'adresse, ignorée"; continue; }
  url="$(url_directe "$url")"
  if [ -n "${DEJA_VUES[$url]:-}" ]; then log "$nom : même base que ${DEJA_VUES[$url]}, ignorée"; continue; fi
  DEJA_VUES[$url]="$nom"

  log "── $nom : copie en cours…"
  copie="$TRAVAIL/$nom.dump"
  if ! pg_dump --format=custom --compress=9 --no-owner --no-acl --file="$copie" "$url"; then
    log "❌ $nom : la copie a échoué"; echo "- ❌ **$nom** : la copie a échoué" >> "$RESUME"; ECHECS=$((ECHECS + 1)); continue
  fi
  tables_source="$(nb_tables "$url")"
  taille="$(du -h "$copie" | cut -f1)"

  # Envoi (chiffré si une clé est fournie)
  fichier="$copie"; extension="dump"
  if [ -n "${SAUVEGARDE_CLE:-}" ]; then
    gpg --batch --yes --quiet --pinentry-mode loopback --passphrase "$SAUVEGARDE_CLE" \
        --symmetric --cipher-algo AES256 --output "$copie.gpg" "$copie"
    fichier="$copie.gpg"; extension="dump.gpg"
  fi
  envoyes=""
  for dest in $DESTS; do
    if envoyer "$dest" "$fichier" "sauvegardes-base/$nom/quotidien/$DATE-$HEURE.$extension"; then
      [ "$JOUR" = "01" ] && envoyer "$dest" "$fichier" "sauvegardes-base/$nom/mensuel/$DATE.$extension"
      envoyes="$envoyes $dest"
    else
      log "❌ $nom : envoi vers $dest échoué"; ECHECS=$((ECHECS + 1))
    fi
  done
  [ -n "$envoyes" ] || { echo "- ❌ **$nom** : aucun envoi réussi" >> "$RESUME"; continue; }

  # Vérification : la copie se restaure-t-elle entièrement ?
  log "── $nom : vérification de la restauration…"
  psql "$VERIF_URL" -XAtqc "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;" >/dev/null
  if pg_restore --no-owner --no-acl --exit-on-error --dbname="$VERIF_URL" "$copie" 2> "$TRAVAIL/$nom.err"; then
    tables_copie="$(nb_tables "$VERIF_URL")"
  else
    tables_copie="erreur"; sed -n 1,5p "$TRAVAIL/$nom.err"
  fi
  if [ "$tables_copie" = "$tables_source" ] && [ "$tables_source" -gt 0 ]; then
    log "✅ $nom : $tables_source tables, $taille, envoyée vers :$envoyes"
    echo "- ✅ **$nom** : $tables_source tables restaurées, $taille, envoyée vers :$envoyes" >> "$RESUME"
    # Ménage UNIQUEMENT après une copie du jour vérifiée
    for dest in $envoyes; do
      nettoyer "$dest" "sauvegardes-base/$nom/quotidien" "$GARDER_JOURS"
      nettoyer "$dest" "sauvegardes-base/$nom/mensuel" "$GARDER_MOIS"
    done
  else
    log "❌ $nom : la copie ne se restaure pas correctement ($tables_copie / $tables_source tables)"
    echo "- ❌ **$nom** : copie envoyée mais restauration incorrecte ($tables_copie / $tables_source tables)" >> "$RESUME"
    ECHECS=$((ECHECS + 1))
  fi
done

[ "$ECHECS" -eq 0 ] || { log "$ECHECS problème(s) — voir ci-dessus."; exit 1; }
log "Sauvegarde terminée."
