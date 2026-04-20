# Les Enfants d'Adam et Ève

Plateforme guinéenne d'enregistrement généalogique, santé, éducation et solidarité.

## Structure du projet

```
/
├── frontend/          → Application React (déploiement : Cloudflare Pages)
├── backend/           → API Node.js/Express (déploiement : Render + Neon)
├── render.yaml        → Configuration déploiement backend sur Render
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
3. Variable d'environnement à ajouter dans Cloudflare :
   ```
   VITE_API_URL=https://enfants-adam-backend.onrender.com
   ```

### Backend → Render + Neon (PostgreSQL)

1. Créer une base PostgreSQL sur [Neon](https://console.neon.tech) → copier la **Connection string**
2. Déployer le backend sur [Render](https://render.com) via `render.yaml` (répertoire racine : `backend/`)
3. Variables d'environnement à définir sur Render :
   ```
   DATABASE_URL=postgresql://user:pass@host/db?sslmode=require   ← depuis Neon
   JWT_SECRET=une_clé_secrète_longue_et_aléatoire
   ADMIN_PASSWORD=mot_de_passe_admin
   CORS_ORIGIN=https://votre-projet.pages.dev
   BREVO_API_KEY=votre_clé_brevo
   FLW_PUBLIC_KEY=FLWPUBK_LIVE-...
   FLW_SECRET_KEY=FLWSECK_LIVE-...
   ```

## Développement local

### Prérequis
- Node.js 18+
- PostgreSQL local (ou utiliser directement la base Neon)

### Démarrage rapide

```bash
# Terminal 1 — Backend (port 5002)
cd backend
cp config.env.example config.env    # remplir les valeurs
npm install
npm run dev

# Terminal 2 — Frontend (port 3000)
cd frontend
cp .env.example .env                # VITE_API_URL=http://localhost:5002 (déjà correct)
npm install
npm run dev
```

## Stack technique

| Couche      | Technologie                       |
|-------------|-----------------------------------|
| Frontend    | React 19 + TypeScript + Vite 7    |
| Styles      | TailwindCSS 4                     |
| Backend     | Node.js + Express 4               |
| ORM         | Sequelize 6 + PostgreSQL          |
| Auth        | JWT + bcrypt                      |
| Email       | Brevo (ex-Sendinblue)             |
| Paiement    | Flutterwave                       |
| Hébergement | Cloudflare Pages + Render + Neon  |
