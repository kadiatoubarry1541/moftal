# Pousser ma base de données vers Render et Neon

Ce guide vous permet d'envoyer votre base locale (PostgreSQL) vers **Neon** et/ou **Render**.

---

## Option 1 : Neon (recommandé)

**Neon** = base PostgreSQL en ligne (gratuite, rapide).

### Étape 1 : Créer la base sur Neon

1. Allez sur [neon.tech](https://neon.tech) et connectez-vous.
2. Créez un **projet** (ou utilisez un existant).
3. Copiez l'**URL de connexion** (Connection string) :
   ```
   postgresql://USER:PASSWORD@ep-xxxxx.region.aws.neon.tech/DBNAME?sslmode=require
   ```

### Étape 2 : Mettre l'URL dans config.env

Ouvrez `backend/config.env` et ajoutez (sans commiter ce fichier) :

```env
RENDER_DATABASE_URL=postgresql://USER:PASSWORD@ep-xxxxx.neon.tech/DBNAME?sslmode=require
```

Collez votre vraie URL à la place.

### Étape 3 : Pousser la base

Dans un terminal :

```powershell
cd backend
npm run db:sync-render
```

Cette commande :
1. Exporte votre base locale → fichier dans `backend/dumps/`
2. Importe ce fichier dans Neon

**C'est fait.** Votre base est maintenant sur Neon.

### Étape 4 : Connecter Render à Neon

Sur [dashboard.render.com](https://dashboard.render.com) → votre service backend → **Environment** :

| Variable | Valeur |
|---------|--------|
| `DATABASE_URL` | La même URL Neon que ci-dessus |
| `ADMIN_PASSWORD` | Votre mot de passe admin |
| `JWT_SECRET` | Une chaîne aléatoire longue |

Redéployez le service. Le backend utilisera Neon.

---

## Option 2 : Base PostgreSQL Render

Si vous avez créé une **base PostgreSQL** directement sur Render :

### Étape 1 : Récupérer l'URL Render

1. [dashboard.render.com](https://dashboard.render.com) → votre base PostgreSQL.
2. **Connection** → copiez **Internal Database URL** (ou **External** si vous lancez depuis votre PC).

### Étape 2 : Mettre l'URL dans config.env

```env
RENDER_DATABASE_URL=postgresql://user:password@dpg-xxx.region.render.com/dbname?sslmode=require
```

### Étape 3 : Pousser la base

```powershell
cd backend
npm run db:sync-render
```

---

## Prérequis

- **PostgreSQL** installé sur votre PC (avec `pg_dump` et `psql` dans le PATH).
- Base locale configurée dans `backend/config.env` (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME).

Si vous avez une erreur « pg_dump introuvable » :
- Installez PostgreSQL : [postgresql.org/download/windows](https://www.postgresql.org/download/windows/)
- Ajoutez au PATH : `C:\Program Files\PostgreSQL\15\bin` (ou votre version)

---

## Commandes utiles

| Commande | Description |
|----------|-------------|
| `npm run db:export` | Exporte uniquement la base locale (fichier dans dumps/) |
| `npm run db:push-render` | Importe le dernier export vers Neon/Render |
| `npm run db:sync-render` | Export + Import en une seule fois |

---

## Utiliser Neon ET Render en même temps

Vous pouvez utiliser **une seule base** sur Neon pour les deux :

- **Render** : le backend utilise `DATABASE_URL` (URL Neon).
- **Neon** : c'est la base elle-même.

Donc : créez une base Neon → poussez vos données avec `db:sync-render` → configurez Render avec `DATABASE_URL` = URL Neon.

---

## Quand refaire une synchro ?

Chaque fois que vous modifiez des données **en local** (nouveaux utilisateurs, familles, etc.) et que vous voulez les avoir **en ligne** :

```powershell
cd backend
npm run db:sync-render
```
