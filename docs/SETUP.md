# Configuration Rapide

## 1. Neon (Base de données)
- Créer compte: https://neon.tech
- New Project → Noter: Host, Database, User, Password
- Exporter local: `pg_dump -h localhost -U postgres -d enfants_adam_eve > backup.sql`
- Importer dans Neon SQL Editor

## 2. Render (Backend)
- Créer compte: https://render.com
- New Web Service → Connecter GitHub repo
- Root Directory: `backend`
- Build: `npm install`
- Start: `npm start`
- Variables:
  - DB_HOST= (votre host Neon)
  - DB_NAME= (votre database Neon)
  - DB_USER= (votre user Neon)
  - DB_PASSWORD= (votre password Neon)
  - JWT_SECRET= (générer un secret)
  - CORS_ORIGIN=https://kadiatoubarry1541.github.io

## 3. GitHub Pages
- Settings → Pages → Source: GitHub Actions
- Secrets → VITE_API_URL = (URL backend Render)
- Actions → Run workflow

## Lien final
https://kadiatoubarry1541.github.io/Les-enfants-d-Adam/

