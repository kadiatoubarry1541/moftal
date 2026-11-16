# Outils de la base (copie, transfert, sauvegarde) : PostgreSQL 18 (lit aussi les
# bases plus anciennes, comme Neon) + envoi vers le stockage en ligne (IDrive / R2)
# + chiffrement. Utilisé seulement à la demande.
FROM postgres:18-alpine
RUN apk add --no-cache bash aws-cli gnupg coreutils
WORKDIR /travail
