#!/usr/bin/env bash
# Sauvegarde de nuit de la base Oracle (lancée chaque nuit par l'installateur, via cron).
# Même méthode qu'avant avec Neon (scripts/sauvegarde/sauvegarder-base.sh) :
# copie complète, chiffrée (SAUVEGARDE_CLE), envoyée sur IDrive (et R2 si configuré),
# puis VÉRIFIÉE en la restaurant dans une base vide. 35 jours + 1 copie par mois pendant 1 an.
#
#   sudo bash sauvegarder.sh
set -euo pipefail
cd "$(dirname "$0")"
lire() { grep -m1 "^$1=" .env | cut -d= -f2- | sed -E 's/^"(.*)"$/\1/'; }
DB_PASSWORD="$(lire DB_PASSWORD)"
: "${DB_PASSWORD:?❌ DB_PASSWORD vide dans .env}"

PRINCIPALE="postgresql://moftal:${DB_PASSWORD}@postgres:5432/moftal"
VERIF="postgresql://moftal:${DB_PASSWORD}@postgres:5432/moftal_verif"

docker compose up -d postgres
# Base vide de vérification (créée une fois)
docker compose exec -T postgres psql -U moftal -d moftal -XAtqc \
  "SELECT 1 FROM pg_database WHERE datname='moftal_verif'" | grep -q 1 \
  || docker compose exec -T postgres psql -U moftal -d moftal -Xqc "CREATE DATABASE moftal_verif"

docker compose --profile outils run --rm -T \
  -e BASES="principale=$PRINCIPALE" \
  -e VERIF_URL="$VERIF" \
  outils bash /scripts/sauvegarde/sauvegarder-base.sh
