# Les Enfants d'Adam et Ève

Plateforme guinéenne d'enregistrement généalogique, santé, éducation et solidarité.

## Structure du projet

```
/
├── frontend/          → Application React (déploiement : Cloudflare Pages)
├── backend/           → API Cloudflare Workers + Hono + D1
├── docs/              → Documentation projet
└── scripts/           → Scripts de démarrage Windows (dev local)
```

## Déploiement

### Frontend → Cloudflare Pages

1. Connecter le dépôt GitHub sur [Cloudflare Pages](https://pages.cloudflare.com)
2. Paramètres de build :
   - **Répertoire racine** : `frontend`
   - **Commande de build** : `npm run build`
   - **Répertoire de sortie** : `dist`
3. Variable d'environnement à ajouter dans Cloudflare Pages :
   ```
   VITE_API_URL=https://enfants-adam-backend.<votre-compte>.workers.dev
   ```

### Backend → Cloudflare Workers + D1

1. Installer Wrangler : `npm install -g wrangler`
2. Se connecter : `wrangler login`
3. Créer la base D1 : `cd backend && npm run db:create`
4. Appliquer les migrations : `npm run db:migrate`
5. Définir les secrets :
   ```bash
   wrangler secret put JWT_SECRET
   wrangler secret put ADMIN_PASSWORD
   wrangler secret put CORS_ORIGIN       # ex: https://votre-projet.pages.dev
   wrangler secret put BREVO_API_KEY
   ```
6. Déployer : `npm run deploy`

## Développement local

### Prérequis
- Node.js 18+
- Wrangler (`npm install -g wrangler`)

### Démarrage rapide

```bash
# Terminal 1 — Backend Cloudflare Worker (port 8787)
cd backend
npm install
npm run db:migrate:local    # initialiser la DB locale D1
npm run dev                 # Wrangler dev

# Terminal 2 — Frontend (port 3000)
cd frontend
npm install
npm run dev
```

L'application sera disponible sur http://localhost:3000

## Stack technique

| Couche      | Technologie                            |
|-------------|----------------------------------------|
| Frontend    | React 19 + TypeScript + Vite 7         |
| Styles      | TailwindCSS 4                          |
| Backend     | Cloudflare Workers + Hono              |
| Base de données | Cloudflare D1 (SQLite serverless)  |
| Fichiers    | Cloudflare R2                          |
| Auth        | JWT + bcrypt                           |
| Email       | Brevo (ex-Sendinblue)                  |
| Paiement    | Flutterwave / FedaPay                  |
| Hébergement | Cloudflare Pages + Cloudflare Workers  |
