# Configuration Cloudflare

## 1. Backend — Cloudflare Workers + D1

```bash
cd backend
npm install
wrangler login
wrangler d1 create enfants-adam-db        # créer la base D1
npm run db:migrate                         # appliquer le schéma
wrangler secret put JWT_SECRET
wrangler secret put ADMIN_PASSWORD
wrangler secret put CORS_ORIGIN            # https://votre-projet.pages.dev
wrangler secret put BREVO_API_KEY
npm run deploy                             # déployer le Worker
```

## 2. Frontend — Cloudflare Pages

- Connecter le repo GitHub sur https://pages.cloudflare.com
- Répertoire racine : `frontend`
- Commande de build : `npm run build`
- Répertoire de sortie : `dist`
- Variable d'environnement :
  - `VITE_API_URL` = URL de votre Worker (ex: `https://enfants-adam-backend.moncompte.workers.dev`)

## 3. Développement local

```bash
# Terminal 1
cd backend && npm run dev     # Wrangler sur port 8787

# Terminal 2
cd frontend && npm run dev    # Vite sur port 3000
```
