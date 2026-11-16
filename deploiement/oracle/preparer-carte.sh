#!/usr/bin/env bash
# Prépare la carte de la Guinée pour le calcul des chemins (OSRM), à pied et en
# voiture / moto. Carte OpenStreetMap gratuite, téléchargée chez Geofabrik.
# À relancer de temps en temps (l'installateur le fait chaque mois) pour avoir
# les rues ajoutées récemment sur OpenStreetMap.
#
#   sudo bash preparer-carte.sh
set -euo pipefail
cd "$(dirname "$0")"

IMAGE="ghcr.io/project-osrm/osrm-backend:${OSRM_VERSION:-v26.4.0}"
SOURCE="https://download.geofabrik.de/africa/guinea-latest.osm.pbf"
DOSSIER="donnees/osrm"
mkdir -p "$DOSSIER/pied" "$DOSSIER/voiture" "$DOSSIER/telechargement"

# CARTE_LOCALE=fichier.osm.pbf : utiliser une carte déjà téléchargée (ou une carte d'essai)
if [ -n "${CARTE_LOCALE:-}" ]; then
  echo "▶ Carte locale : $CARTE_LOCALE"
  cp "$CARTE_LOCALE" "$DOSSIER/telechargement/guinee.osm.pbf"
else
  echo "▶ Téléchargement de la carte de la Guinée (OpenStreetMap)…"
  curl -fL --retry 3 -o "$DOSSIER/telechargement/guinee.osm.pbf.nouveau" "$SOURCE"
  mv "$DOSSIER/telechargement/guinee.osm.pbf.nouveau" "$DOSSIER/telechargement/guinee.osm.pbf"
fi

preparer() { # preparer <dossier> <profil OSRM>
  local dossier="$1" profil="$2" travail
  travail="$DOSSIER/$dossier.nouveau"
  rm -rf "$travail"; mkdir -p "$travail"
  cp "$DOSSIER/telechargement/guinee.osm.pbf" "$travail/guinee.osm.pbf"
  echo "▶ Préparation des chemins « $dossier » (profil $profil)…"
  docker run --rm -v "$PWD/$travail:/data" "$IMAGE" osrm-extract -p "/opt/$profil.lua" /data/guinee.osm.pbf
  docker run --rm -v "$PWD/$travail:/data" "$IMAGE" osrm-partition /data/guinee.osrm
  docker run --rm -v "$PWD/$travail:/data" "$IMAGE" osrm-customize /data/guinee.osrm
  rm -f "$travail/guinee.osm.pbf"
  # Remplacement d'un coup : le service ne voit jamais une carte à moitié prête
  rm -rf "$DOSSIER/$dossier.ancien"
  [ -d "$DOSSIER/$dossier" ] && mv "$DOSSIER/$dossier" "$DOSSIER/$dossier.ancien"
  mv "$travail" "$DOSSIER/$dossier"
  rm -rf "$DOSSIER/$dossier.ancien"
}

preparer pied foot
preparer voiture car

# Les services de calcul relisent la nouvelle carte
if docker compose ps --services --status running 2>/dev/null | grep -q osrm; then
  docker compose restart osrm-pied osrm-voiture
fi
echo "✅ Carte de la Guinée prête (à pied et en voiture)."
