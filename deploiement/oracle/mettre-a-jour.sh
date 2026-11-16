#!/usr/bin/env bash
# Met le serveur Moftal (Oracle) à la dernière version de main.
# Lancé automatiquement par GitHub après chaque mise en ligne réussie (si les
# secrets ORACLE_* sont configurés), ou à la main :   sudo bash mettre-a-jour.sh
set -euo pipefail
cd "$(dirname "$0")"

git -C ../.. fetch --quiet origin main
git -C ../.. checkout --quiet main
git -C ../.. reset --quiet --hard origin/main

docker compose build --pull serveur
docker compose up -d --remove-orphans
docker image prune -f >/dev/null
echo "✅ Serveur Moftal à jour : $(git -C ../.. log -1 --format='%h %s')"
