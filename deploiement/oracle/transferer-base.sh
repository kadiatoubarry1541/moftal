#!/usr/bin/env bash
# Transfert de la base Moftal : Neon → PostgreSQL du serveur Oracle.
#
#   sudo bash transferer-base.sh            (refuse si la base Oracle contient déjà des données)
#   sudo bash transferer-base.sh --forcer   (dernier transfert, le jour de la bascule :
#                                            remplace la base Oracle par la copie de Neon)
#
# Le serveur Moftal sur Oracle est arrêté pendant le transfert, puis relancé.
# Neon n'est jamais modifié : il reste intact tant que vous ne le supprimez pas.
set -euo pipefail
cd "$(dirname "$0")"
FORCER="${1:-}"

[ -f .env ] || { echo "❌ Fichier .env absent : copiez env.exemple en .env et remplissez-le." >&2; exit 1; }
# Lecture sans « source » : les adresses contiennent « & » et « ? »
lire() { grep -m1 "^$1=" .env | cut -d= -f2- | sed -E 's/^"(.*)"$/\1/'; }
NEON_DATABASE_URL="$(lire NEON_DATABASE_URL)"
DB_PASSWORD="$(lire DB_PASSWORD)"
: "${NEON_DATABASE_URL:?❌ NEON_DATABASE_URL vide dans .env (adresse de la base Neon, voir GUIDE.md)}"
: "${DB_PASSWORD:?❌ DB_PASSWORD vide dans .env}"

# Connexion directe (le « pooler » de Neon ne convient pas à pg_dump)
SOURCE="$(echo "$NEON_DATABASE_URL" | sed -E 's/-pooler\././')"
CIBLE="postgresql://moftal:${DB_PASSWORD}@postgres:5432/moftal"
outils() { docker compose --profile outils run --rm -T outils "$@"; }

docker compose up -d postgres
docker compose stop serveur 2>/dev/null || true

compter() { outils psql "$1" -XAtqc "SELECT count(*) FROM information_schema.tables WHERE table_type='BASE TABLE' AND table_schema='public'"; }
lignes() { outils psql "$1" -XAtqc "SELECT (SELECT count(*) FROM users)||' comptes, '||(SELECT count(*) FROM professional_accounts)||' comptes pro'" 2>/dev/null || echo "?"; }

existantes="$(compter "$CIBLE")"
if [ "$existantes" != "0" ] && [ "$FORCER" != "--forcer" ]; then
  echo "❌ La base Oracle contient déjà $existantes tables. Pour la remplacer par Neon : sudo bash transferer-base.sh --forcer" >&2
  exit 1
fi

echo "▶ Copie de la base Neon…"
mkdir -p donnees/transfert
outils pg_dump --format=custom --no-owner --no-acl --file=/transfert/moftal.dump "$SOURCE"
tables_source="$(compter "$SOURCE")"
resume_source="$(lignes "$SOURCE")"

echo "▶ Restauration dans la base Oracle…"
outils psql "$CIBLE" -XAtqc "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;" >/dev/null
outils pg_restore --no-owner --no-acl --exit-on-error --dbname="$CIBLE" /transfert/moftal.dump
tables_cible="$(compter "$CIBLE")"
resume_cible="$(lignes "$CIBLE")"

echo "   Neon   : $tables_source tables — $resume_source"
echo "   Oracle : $tables_cible tables — $resume_cible"
if [ "$tables_source" != "$tables_cible" ] || [ "$resume_source" != "$resume_cible" ]; then
  echo "❌ Les deux bases ne sont pas identiques : NE PAS basculer. Relancez le transfert." >&2
  exit 1
fi
rm -f donnees/transfert/moftal.dump

docker compose up -d serveur
echo "✅ Transfert terminé et vérifié : $tables_cible tables, $resume_cible."
