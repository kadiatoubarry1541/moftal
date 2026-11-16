# Serveur Moftal — image pour le serveur Oracle (processeur ARM « Ampere ») ou tout
# autre serveur Linux. Aucune dépendance native : la même image marche partout.
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY . .
ENV NODE_ENV=production PORT=5002
EXPOSE 5002
# Le dossier des fichiers reçus est monté depuis le serveur (jamais perdu)
VOLUME ["/app/uploads"]
CMD ["node", "src/server.js"]
