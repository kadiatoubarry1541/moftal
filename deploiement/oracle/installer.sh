#!/usr/bin/env bash
# Installation complète de Moftal sur un serveur Oracle « Always Free » (Ubuntu 24.04).
# À lancer une seule fois, depuis ce dossier :   sudo bash installer.sh
#
# Ce que fait ce script (on peut le relancer sans danger) :
#   1. installe Docker ;
#   2. ouvre les portes 80 et 443 (site sécurisé) dans le pare-feu de la machine ;
#   3. prépare le fichier .env (mot de passe de la base généré tout seul) ;
#   4. prépare la carte de la Guinée pour le guidage ;
#   5. transfère la base depuis Neon (si NEON_DATABASE_URL est rempli) ;
#   6. démarre tout (base, serveur, guidage, HTTPS) ;
#   7. programme la sauvegarde chaque nuit et la mise à jour de la carte chaque mois.
set -euo pipefail
cd "$(dirname "$0")"
DOSSIER="$(pwd)"

[ "$(id -u)" = "0" ] || { echo "Lancez avec sudo : sudo bash installer.sh" >&2; exit 1; }
etape() { echo; echo "════ $* ════"; }

etape "1. Docker"
if ! command -v docker >/dev/null || ! docker compose version >/dev/null 2>&1; then
  apt-get update -q
  apt-get install -y -q docker.io docker-compose-v2 git curl openssl
  systemctl enable --now docker
fi
docker compose version

etape "2. Pare-feu : portes 80 et 443"
# Les images Ubuntu d'Oracle bloquent tout sauf SSH dans iptables
for port in 80 443; do
  iptables -C INPUT -p tcp --dport "$port" -j ACCEPT 2>/dev/null || iptables -I INPUT 6 -p tcp --dport "$port" -j ACCEPT
done
iptables -C INPUT -p udp --dport 443 -j ACCEPT 2>/dev/null || iptables -I INPUT 6 -p udp --dport 443 -j ACCEPT
if command -v netfilter-persistent >/dev/null; then netfilter-persistent save; else
  DEBIAN_FRONTEND=noninteractive apt-get install -y -q iptables-persistent && netfilter-persistent save; fi
echo "Portes ouvertes. (Pensez aussi à la « liste de sécurité » dans la console Oracle — GUIDE.md, étape 3.)"

etape "3. Réglages (.env)"
[ -f .env ] || cp env.exemple .env
chmod 600 .env
if ! grep -qE '^DB_PASSWORD=.+' .env; then
  motdepasse="$(openssl rand -hex 24)"
  sed -i "s/^DB_PASSWORD=.*/DB_PASSWORD=$motdepasse/" .env
  echo "Mot de passe de la base généré et enregistré dans .env."
fi
if ! grep -qE '^JWT_SECRET=.+' .env; then
  echo "❌ JWT_SECRET est vide dans .env. Copiez les réglages de Render dans .env (GUIDE.md, étape 5), puis relancez : sudo bash installer.sh" >&2
  exit 1
fi
mkdir -p donnees/postgres donnees/uploads donnees/caddy/data donnees/caddy/config donnees/transfert

etape "4. Carte de la Guinée pour le guidage"
if [ ! -f donnees/osrm/pied/guinee.osrm.mldgr ] || [ ! -f donnees/osrm/voiture/guinee.osrm.mldgr ]; then
  bash preparer-carte.sh
else
  echo "Déjà prête."
fi

etape "5. Base de données"
docker compose build
docker compose up -d postgres
if grep -qE '^NEON_DATABASE_URL=.+' .env; then
  tables="$(docker compose exec -T postgres psql -U moftal -d moftal -XAtqc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")"
  if [ "$tables" = "0" ]; then
    bash transferer-base.sh
  else
    echo "La base Oracle contient déjà $tables tables : pas de nouveau transfert."
    echo "(Le jour de la bascule : sudo bash transferer-base.sh --forcer — voir GUIDE.md.)"
  fi
else
  echo "NEON_DATABASE_URL vide : base Oracle neuve (le serveur crée les tables au démarrage)."
fi

etape "6. Démarrage de tout Moftal"
docker compose up -d
sleep 20
if docker compose exec -T serveur wget -qO- http://localhost:5002/api/health >/dev/null 2>&1; then
  echo "✅ Le serveur Moftal répond."
else
  echo "⚠️  Le serveur ne répond pas encore. Voir : docker compose logs --tail 50 serveur"
fi

etape "7. Tâches automatiques"
cat > /etc/cron.d/moftal <<CRON
# Moftal — sauvegarde chaque nuit (02:17), carte de la Guinée mise à jour le 1er du mois (03:40)
SHELL=/bin/bash
17 2 * * * root cd "$DOSSIER" && bash sauvegarder.sh >> /var/log/moftal-sauvegarde.log 2>&1
40 3 1 * * root cd "$DOSSIER" && bash preparer-carte.sh >> /var/log/moftal-carte.log 2>&1
CRON
chmod 644 /etc/cron.d/moftal
echo "Programmé : sauvegarde chaque nuit, carte chaque mois."

echo
echo "🎉 Installation terminée. Suite : GUIDE.md, étape 7 (vérifier puis faire pointer api.moftal.com vers ce serveur)."
