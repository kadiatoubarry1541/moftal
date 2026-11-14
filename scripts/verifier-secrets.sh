#!/usr/bin/env bash
# Garde-fou : aucune vraie clé ni aucun mot de passe dans les fichiers du projet
# (le dépôt est public). Lancé à chaque envoi par GitHub ; à lancer aussi à la main.
# Une clé trouvée = échec : la retirer du code, la mettre chez l'hébergeur (Render,
# secrets GitHub…), puis la RÉVOQUER et en créer une nouvelle.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"

MOTIFS=(
  'npg_[A-Za-z0-9]{12,}'                                   # mot de passe Neon
  'private_[A-Za-z0-9+/=]{20,}'                            # clé privée ImageKit
  'AKIA[0-9A-Z]{16}'                                       # clé d'accès type S3
  'gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}'
  'sk_live_[A-Za-z0-9]{10,}|rk_live_[A-Za-z0-9]{10,}'
  'xkeysib-[a-f0-9]{20,}|xsmtpsib-[a-f0-9]{20,}'           # clés d'envoi d'e-mails
  '-----BEGIN [A-Z ]*PRIVATE KEY-----'
  'postgres(ql)?://[^:@/[:space:]]+:[^@/[:space:]$]{8,}@[a-z0-9.-]*\.(neon\.tech|render\.com|amazonaws\.com|supabase\.co)'
)
motif=$(IFS='|'; echo "${MOTIFS[*]}" | sed -E 's/ *#[^|]*//g')

trouve=$(git grep -nIE "$motif" -- . ':!**/package-lock.json' ':!scripts/verifier-secrets.sh' \
  | grep -vE '://(user(name)?|utilisateur):(password|motdepasse|pass)@' || true)  # exemples de documentation
if [ -n "$trouve" ]; then
  echo "🚨 Clé ou mot de passe trouvé dans le projet (valeurs masquées) :"
  echo "$trouve" | sed -E 's/(:[0-9]+:).*/\1 …/'
  exit 1
fi
echo "✅ Aucune clé ni aucun mot de passe dans le projet."
