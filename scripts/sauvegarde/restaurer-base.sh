#!/usr/bin/env bash
# Restaurer une sauvegarde Moftal dans une base PostgreSQL VIDE.
#
#   ./restaurer-base.sh <fichier .dump ou .dump.gpg> <adresse de la base vide>
#
# Conseil : restaurez d'abord dans une base neuve (par ex. une nouvelle
# « branche » Neon), vérifiez, puis faites pointer le serveur dessus.
# Ce script refuse d'écrire dans une base qui contient déjà des tables.
# Pour un fichier chiffré (.gpg), donnez le mot de passe : SAUVEGARDE_CLE=… ./restaurer-base.sh …
set -euo pipefail

fichier="${1:?Usage : $0 <fichier.dump[.gpg]> <adresse de la base vide>}"
cible="${2:?Usage : $0 <fichier.dump[.gpg]> <adresse de la base vide>}"
travail="$(mktemp -d)"; trap 'rm -rf "$travail"' EXIT

existantes="$(psql "$cible" -XAtqc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")"
if [ "$existantes" != "0" ]; then
  echo "❌ La base cible contient déjà $existantes table(s). Restaurez dans une base vide." >&2
  exit 1
fi

if [[ "$fichier" == *.gpg ]]; then
  : "${SAUVEGARDE_CLE:?Fichier chiffré : donnez le mot de passe dans SAUVEGARDE_CLE}"
  gpg --batch --yes --quiet --pinentry-mode loopback --passphrase "$SAUVEGARDE_CLE" \
      --decrypt --output "$travail/base.dump" "$fichier"
  fichier="$travail/base.dump"
fi

echo "Restauration en cours…"
pg_restore --no-owner --no-acl --exit-on-error --dbname="$cible" "$fichier"
tables="$(psql "$cible" -XAtqc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")"
echo "✅ Restauration terminée : $tables tables."
