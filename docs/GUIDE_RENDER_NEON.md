# Guide pas à pas : déployer Les Enfants d’Adam sur Render (un seul service) avec Neon

Ce guide suppose que tu as **un nouveau compte Render** et que tu veux :
- **Un seul service** : frontend + backend ensemble (tout « soudé »).
- **Base de données Neon** : tu utilises ton lien de connexion Neon (pas la base Render).
- **Synchroniser** ta base locale avec la base en ligne (Neon).

---

## Vue d’ensemble

| Élément | Détail |
|--------|--------|
| **Render** | 1 seul **Web Service** (pas de Static Site, pas de base PostgreSQL Render). |
| **Base de données** | **Neon** : tu colles ton URL de connexion dans les variables d’environnement. |
| **Synchronisation** | Depuis ton PC : export de la base locale → import vers Neon (voir partie 4). |

---

## Partie 1 : Récupérer l’URL de ta base Neon

1. Va sur [Neon](https://neon.tech) et connecte-toi.
2. Ouvre ton **projet** (ou crée-en un).
3. Dans le tableau de bord : **Connection string** ou **Dashboard** → onglet **Connection**.
4. Copie l’URL au format :
   ```text
   postgresql://USER:PASSWORD@ep-xxxxx.region.aws.neon.tech/DBNAME?sslmode=require
   ```
5. Garde cette URL sous la main : tu en auras besoin pour **Render** et pour la **synchronisation** depuis ton PC.

Si tu n’as pas encore de base sur Neon, crée un projet : Neon te donnera directement une URL de ce type.

---

## Partie 2 : Créer le service sur Render (nouveau compte)

### Étape 1 : Connexion et nouveau service

1. Va sur [render.com](https://render.com) et connecte-toi (nouveau compte si besoin).
2. **Dashboard** → **New +** → **Web Service**.
3. Connecte ton **GitHub** (ou GitLab) si ce n’est pas déjà fait.
4. Choisis le dépôt **Les-enfants-d-Adam** (ou le nom exact de ton repo).

### Étape 2 : Configuration du Web Service

Remplis comme suit (tout le reste peut rester par défaut) :

| Champ | Valeur |
|--------|--------|
| **Name** | `les-enfants-d-adam` (ou un nom de ton choix). |
| **Region** | Choisis la plus proche (ex. Frankfurt). |
| **Root Directory** | *Laisser vide* (racine du repo). |
| **Runtime** | **Node**. |
| **Build Command** | `npm run build:render` |
| **Start Command** | `cd backend && npm start` |
| **Instance Type** | **Free** (pour commencer). |

Enregistre / **Create Web Service**.

### Étape 3 : Variables d’environnement (dont Neon)

Dans le service créé : **Environment** (menu de gauche).

Ajoute ces variables **une par une** (Add Environment Variable) :

| Key | Value | Obligatoire |
|-----|--------|-------------|
| `NODE_ENV` | `production` | Oui |
| `DATABASE_URL` | **Ton URL Neon** (celle copiée à la partie 1). Ex. `postgresql://user:pass@ep-xxx.neon.tech/dbname?sslmode=require` | Oui |
| `ADMIN_PASSWORD` | Un mot de passe fort pour te connecter en admin (ex. sur le site). | Oui (pour créer l’admin) |
| `ADMIN_NUMERO_H` | `G0C0P0R0E0F0 0` | Optionnel (c’est la valeur par défaut) |
| `JWT_SECRET` | Une chaîne aléatoire longue (ex. générée sur [randomkeygen.com](https://randomkeygen.com)). | Recommandé |
| `CORS_ORIGIN` | L’URL de ton site Render. Ex. `https://les-enfants-d-adam.onrender.com` (à adapter selon le nom que tu as choisi). | Recommandé |

**Important :**  
- `DATABASE_URL` doit être **exactement** l’URL Neon (avec `?sslmode=require` à la fin en général).  
- Après avoir ajouté ou modifié des variables, fais un **redéploiement** (Manual Deploy → Deploy latest commit).

Tu n’as **pas** besoin de `VITE_API_URL` : avec un seul service, le front est servi par le backend et appelle `/api` sur la même origine.

---

## Partie 3 : Premier déploiement

1. Vérifie que ton code est poussé sur GitHub (au moins les dossiers `frontend/`, `backend/`, et le `package.json` à la racine avec le script `build:render`).
2. Sur Render, le premier déploiement se lance souvent automatiquement après la création du service.
3. Si ce n’est pas le cas : **Manual Deploy** → **Deploy latest commit**.
4. Attends la fin du **Build** puis du **Deploy**.
5. Ouvre l’URL du service (ex. `https://les-enfants-d-adam.onrender.com`) : tu dois voir le site (page d’accueil, login, etc.).

En cas d’erreur au build, regarde les **logs** (Build logs / Deploy logs) sur Render et vérifie que `npm run build:render` et `cd backend && npm start` sont bien exécutés à la racine du repo.

---

## Partie 4 : Synchroniser la base locale avec Neon (base en ligne)

Pour que ta **base locale** (PostgreSQL sur ton PC) soit **identique** à la base **en ligne** (Neon), tu fais : **export local** → **import vers Neon**.

### Prérequis sur ton PC

- **PostgreSQL** installé en local (avec `pg_dump` et `psql` dans le PATH).
- Base locale déjà utilisée par le projet (fichier `backend/config.env` avec `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`).

### Option A : Synchronisation en une commande (recommandé)

Depuis ton PC, dans un terminal :

**Windows (PowerShell) :**

```powershell
cd backend
$env:RENDER_DATABASE_URL="postgresql://USER:PASSWORD@ep-xxxxx.neon.tech/DBNAME?sslmode=require"
npm run db:sync-render
```

**Remplace** `postgresql://USER:PASSWORD@ep-xxxxx...` par **ta vraie URL Neon** (la même que dans Render). Tu peux aussi utiliser `NEON_DATABASE_URL` au lieu de `RENDER_DATABASE_URL`.

**Windows (cmd) :**

```cmd
cd backend
set RENDER_DATABASE_URL=postgresql://USER:PASSWORD@ep-xxxxx.neon.tech/DBNAME?sslmode=require
npm run db:sync-render
```

**Git Bash / Linux / Mac :**

```bash
cd backend
export RENDER_DATABASE_URL="postgresql://USER:PASSWORD@ep-xxxxx.neon.tech/DBNAME?sslmode=require"
npm run db:sync-render
```

Cette commande :
1. Exporte ta base **locale** dans un fichier `.sql` (dans `backend/dumps/`).
2. Importe ce fichier dans la base **Neon** (via l’URL que tu as mise dans `RENDER_DATABASE_URL`).

Après ça, **base locale** et **base en ligne (Neon)** ont le même contenu (tables, utilisateurs, admin, etc.).

### Option B : En deux étapes (export puis import)

Si tu préfères contrôler chaque étape :

1. **Export de la base locale :**
   ```bash
   cd backend
   npm run db:export
   ```
   Un fichier est créé dans `backend/dumps/local-backup-YYYY-MM-DD-HHmm.sql`.

2. **Import vers Neon :**
   ```bash
   cd backend
   $env:RENDER_DATABASE_URL="TON_URL_NEON_ICI"
   npm run db:push-render
   ```
   (Sous Windows cmd : `set RENDER_DATABASE_URL=...`)

Tu peux aussi mettre l’URL Neon dans `backend/config.env` (sans la commiter) :

```env
RENDER_DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/dbname?sslmode=require
```

Ensuite, depuis `backend/` :

```bash
npm run db:sync-render
```

sans redéfinir la variable à chaque fois.

### Quand refaire une synchro ?

- Après avoir créé des utilisateurs ou modifié des données en **local** et que tu veux les avoir **en ligne**.
- Chaque exécution de `db:sync-render` **remplace** le contenu de la base Neon par celui de l’export local (dernier fichier dans `dumps/` si tu ne précises pas de fichier).

---

## Partie 5 : Connexion sur le site en ligne

1. Ouvre l’URL de ton service Render (ex. `https://les-enfants-d-adam.onrender.com`).
2. Va sur la page de **connexion**.
3. Pour l’admin :
   - **NumeroH :** `G0C0P0R0E0F0 0` (avec le **chiffre 0**, pas la lettre O).
   - **Mot de passe :** la valeur de `ADMIN_PASSWORD` que tu as mise dans Render.

Si tu as synchronisé ta base locale avec Neon, les autres comptes (créés en local) sont aussi présents en ligne : tu peux te connecter avec leurs NumeroH et mots de passe.

---

## Récap des liens importants

- **Neon** : [neon.tech](https://neon.tech) → ton projet → **Connection string** = `DATABASE_URL` et `RENDER_DATABASE_URL`.
- **Render** : [dashboard.render.com](https://dashboard.render.com) → ton Web Service → **Environment** = `DATABASE_URL` (Neon), `ADMIN_PASSWORD`, `JWT_SECRET`, `CORS_ORIGIN`.

## En cas de problème

- **« NumeroH ou mot de passe incorrect »**  
  Vérifier : `ADMIN_PASSWORD` défini sur Render, base Neon à jour (faire un `db:sync-render` si les comptes sont en local), et bien utiliser le **chiffre 0** dans le NumeroH.

- **Build échoue sur Render**  
  Vérifier les logs (Build). Souvent : `npm run build:render` doit s’exécuter à la racine (frontend build + backend install).

- **Base vide ou pas à jour en ligne**  
  Refaire une synchro : `RENDER_DATABASE_URL=url_neon npm run db:sync-render` depuis `backend/`.

- **Erreur de connexion à la base**  
  Vérifier que `DATABASE_URL` sur Render est exactement l’URL Neon (avec `?sslmode=require`).

---

Tu as maintenant un **seul service** sur Render qui sert le site et l’API, une base **Neon** pour les données, et une procédure claire pour **synchroniser** ta base locale avec celle en ligne.
