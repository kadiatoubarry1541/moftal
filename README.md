# Moftal — Famille & Services

Plateforme web et mobile « Ensemble pour les enfants d'Adam », pensée d'abord pour la Guinée
et l'Afrique : arbre familial, espace Famille, Services et rendez-vous, Échanges, Éducation,
Moftal Pay et application de gestion pour chaque établissement.

Les règles du projet sont dans [`CLAUDE.md`](CLAUDE.md).

## Structure du projet

```
/
├── frontend/          → Application React (site + application installable)
├── backend/           → Serveur API Node.js (Express + PostgreSQL)
├── IA SC/             → Service IA (Python), démarré par le serveur s'il est présent
├── docs/              → Documentation projet
└── scripts/           → Scripts de démarrage Windows (dev local)
```

## Déploiement

### Frontend → Cloudflare Workers (`frontend/wrangler.toml`)

Chaque envoi sur `main` construit et publie le site automatiquement
(`.github/workflows/deploy.yml`). Le fichier `frontend/worker.js` sert le site et
redirige les appels `/api/*` vers `https://api.moftal.com`.

Secret GitHub nécessaire : `CLOUDFLARE_API_TOKEN`.

### Backend → `https://api.moftal.com`

Serveur Express (`backend/src/server.js`) avec une base PostgreSQL.
Configuration d'hébergement : `railway.json` (Railway) ou `backend/Procfile`.

Variables d'environnement à définir chez l'hébergeur (voir `backend/config.env.example`) :

- `DATABASE_URL` — adresse de la base PostgreSQL
- `JWT_SECRET` — **obligatoire**, longue chaîne secrète propre à la production
- `ADMIN_PASSWORD`, `SUPER_ADMIN_PASSWORD` — comptes administrateur
- `CORS_ORIGIN`, `BACKEND_URL`
- clés des services d'envoi d'e-mails et de paiement

Le workflow `.github/workflows/keep-alive.yml` appelle `/api/health` régulièrement
pour garder le serveur éveillé.

## Développement local

### Prérequis
- Node.js 22
- PostgreSQL

### Démarrage rapide

```bash
# Terminal 1 — Backend (port 5002)
cd backend
cp config.env.example config.env   # puis remplir les valeurs
npm install
npm run dev

# Terminal 2 — Frontend (port 3000)
cd frontend
npm install
npm run dev
```

L'application sera disponible sur http://localhost:3000 (les appels `/api` vont au port 5002).

### Vérifications

```bash
cd backend && npm test              # tests du serveur
cd frontend && npm run typecheck    # vérification TypeScript
cd frontend && npm run build        # construction du site
```

## Stack technique

| Couche          | Technologie                              |
|-----------------|------------------------------------------|
| Frontend        | React 19 + TypeScript + Vite 7           |
| Styles          | TailwindCSS 4                            |
| Backend         | Node.js + Express + Sequelize            |
| Base de données | PostgreSQL (photos et fichiers compris)  |
| Auth            | JWT + bcrypt                             |
| Hébergement     | Cloudflare Workers (site) + serveur Node (API) |
