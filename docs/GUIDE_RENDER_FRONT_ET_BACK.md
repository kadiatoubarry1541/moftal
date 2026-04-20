# Déployer Les Enfants d’Adam sur Render : frontend à part + backend à part (liés)

Ce guide décrit un déploiement avec **deux services** sur Render :
- **Backend** = 1 Web Service (API Node + base Neon).
- **Frontend** = 1 Static Site (React/Vite), qui appelle le backend.

Les deux sont **liés** via l’URL de l’API (variable d’environnement au build du frontend) et CORS sur le backend.

---

## Vue d’ensemble

| Service | Type Render | Rôle |
|--------|-------------|------|
| **Backend** | Web Service (Node) | API, base Neon, pas de site statique. |
| **Frontend** | Static Site | Site React (build Vite), appelle l’API du backend. |
| **Base de données** | Neon (externe) | Une seule base, connectée au **backend** uniquement. |

Ordre conseillé : créer d’abord le **backend**, noter son URL, puis créer le **frontend** en indiquant cette URL.

---

## Partie 1 : Base de données Neon

1. Va sur [neon.tech](https://neon.tech) et connecte-toi.
2. Ouvre ton projet → **Connection string** (ou onglet Connection).
3. Copie l’URL, par ex. :  
   `postgresql://USER:PASSWORD@ep-xxxxx.region.aws.neon.tech/DBNAME?sslmode=require`  
   Tu en auras besoin pour le **backend** sur Render (et pour la synchro locale).

---

## Partie 2 : Créer le backend (Web Service)

### 2.1 Nouveau Web Service

1. [Render](https://render.com) → **Dashboard** → **New +** → **Web Service**.
2. Connecte **GitHub** si besoin, puis choisis le dépôt **Les-enfants-d-Adam** (ou le nom exact).
3. Remplis :

| Champ | Valeur |
|--------|--------|
| **Name** | `les-enfants-d-adam-backend` (ou un nom court, ex. `lea-backend`). |
| **Region** | Ex. Frankfurt. |
| **Root Directory** | `backend` |
| **Runtime** | **Node** |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | **Free** (pour commencer). |

4. Clique sur **Create Web Service**.

### 2.2 Variables d’environnement du backend

Dans le service créé : **Environment** (menu gauche) → **Add Environment Variable**.

Ajoute **une par une** :

| Key | Value |
|-----|--------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | **Ton URL Neon** (celle copiée à la partie 1). |
| `ADMIN_PASSWORD` | Mot de passe de ton choix pour te connecter en admin. |
| `ADMIN_NUMERO_H` | `G0C0P0R0E0F0 0` (optionnel). |
| `JWT_SECRET` | Une longue chaîne aléatoire (ex. [randomkeygen.com](https://randomkeygen.com)). |
| `CORS_ORIGIN` | **À remplir après** : URL du **frontend** sur Render. Ex. `https://les-enfants-d-adam.onrender.com` (voir partie 3). |

**Important :**  
- `DATABASE_URL` = URL Neon complète (avec `?sslmode=require` si fourni par Neon).  
- Tu peux laisser `CORS_ORIGIN` vide au premier déploiement, puis l’ajouter après avoir créé le frontend.

Enregistre, puis **Manual Deploy** → **Deploy latest commit** si le déploiement n’a pas démarré.

### 2.3 Noter l’URL du backend

Quand le déploiement est terminé, ouvre l’onglet du service backend. En haut tu vois l’**URL** du service, par ex. :

- `https://les-enfants-d-adam-backend.onrender.com`

**Copie cette URL** (sans `/api` à la fin) : tu en auras besoin pour le frontend.  
Exemple à garder : `https://les-enfants-d-adam-backend.onrender.com`

---

## Partie 3 : Créer le frontend (Static Site)

### 3.1 Nouveau Static Site

1. **Dashboard** Render → **New +** → **Static Site** (pas Web Service).
2. Choisis le **même** dépôt : Les-enfants-d-Adam.
3. Remplis :

| Champ | Valeur |
|--------|--------|
| **Name** | `les-enfants-d-adam` (ou le nom que tu veux pour l’URL du site). |
| **Branch** | `main` |
| **Root Directory** | `frontend` |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `dist` |

### 3.2 Variable d’environnement pour lier le frontend au backend

C’est **ici** que tu lies le frontend au backend.

Dans la section **Environment** du Static Site, ajoute **une** variable :

| Key | Value |
|-----|--------|
| `VITE_API_URL` | **L’URL du backend** (celle notée à la partie 2.3). Ex. `https://les-enfants-d-adam-backend.onrender.com` |

- **Ne pas** mettre `/api` à la fin : le code du frontend ajoute `/api` tout seul.  
- Cette variable est lue **au moment du build**. Si tu changes l’URL plus tard, il faudra **redéployer** le frontend (Manual Deploy).

Enregistre, puis lance le déploiement (**Create Static Site** ou **Manual Deploy**).

### 3.3 Revenir au backend pour CORS

Pour que le navigateur puisse appeler l’API depuis ton site :

1. Ouvre le service **backend** sur Render.
2. **Environment** → édite `CORS_ORIGIN` (ou ajoute-la si tu ne l’as pas mise).
3. Mets **l’URL de ton Static Site** (affichée en haut du service frontend), ex. :  
   `https://les-enfants-d-adam.onrender.com`  
   (sans slash final.)
4. Enregistre puis **Manual Deploy** sur le backend.

---

## Partie 4 : Vérifier que tout est lié

1. Ouvre l’URL du **frontend** (Static Site), ex. `https://les-enfants-d-adam.onrender.com`.
2. Tu dois voir le site (accueil, login, etc.).
3. Va sur la page de **connexion** et connecte-toi (ex. NumeroH `G0C0P0R0E0F0 0`, mot de passe = `ADMIN_PASSWORD`).
4. Si la connexion fonctionne, le frontend appelle bien le backend ; les deux sont liés.

En cas d’erreur « réseau » ou « CORS » : vérifier que `CORS_ORIGIN` sur le backend = exactement l’URL du frontend (sans slash final), et que `VITE_API_URL` sur le frontend = l’URL du backend (sans `/api`).

---

## Partie 5 : Synchroniser la base locale avec Neon

Pour avoir les mêmes données en ligne qu’en local :

1. Dans `backend/config.env` : base locale configurée (`DB_*` ou `DATABASE_URL`).
2. Depuis ton PC (PowerShell) :

```powershell
cd backend
$env:RENDER_DATABASE_URL="postgresql://USER:PASSWORD@ep-xxxxx.neon.tech/DBNAME?sslmode=require"
npm run db:sync-render
```

Remplace par **ta** URL Neon. Ensuite la base Neon a le même contenu que ta base locale.

---

## Récap des liens

| Où | Variable | Valeur |
|----|----------|--------|
| **Backend** (Web Service) | `DATABASE_URL` | URL Neon |
| | `CORS_ORIGIN` | URL du **frontend** (ex. `https://les-enfants-d-adam.onrender.com`) |
| **Frontend** (Static Site) | `VITE_API_URL` | URL du **backend** (ex. `https://les-enfants-d-adam-backend.onrender.com`) |

- Le **frontend** appelle le backend grâce à `VITE_API_URL` (intégré au build).  
- Le **backend** accepte les requêtes du frontend grâce à `CORS_ORIGIN`.

---

## En cas de problème

- **Connexion / login ne marche pas**  
  Vérifier : `VITE_API_URL` sur le frontend = URL du backend (sans `/api`). Redéployer le frontend après toute modification de `VITE_API_URL`.

- **Erreur CORS dans la console du navigateur**  
  Vérifier : `CORS_ORIGIN` sur le backend = URL exacte du frontend (sans slash final). Redéployer le backend.

- **« NumeroH ou mot de passe incorrect »**  
  Vérifier : `ADMIN_PASSWORD` défini sur le backend, base Neon à jour (synchro avec `db:sync-render` si besoin), et utiliser le **chiffre 0** dans le NumeroH (pas la lettre O).

- **Build frontend échoue**  
  Vérifier : Root Directory = `frontend`, Build Command = `npm install && npm run build`, Publish Directory = `dist`.

- **Build backend échoue**  
  Vérifier : Root Directory = `backend`, Build Command = `npm install`, Start Command = `npm start`.

---

Tu as maintenant le **frontend à part** (Static Site) et le **backend à part** (Web Service), **liés** par `VITE_API_URL` et `CORS_ORIGIN`, avec la base Neon sur le backend.
