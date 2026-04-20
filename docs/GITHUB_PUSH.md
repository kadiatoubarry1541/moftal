# Pousser le projet sur GitHub

## ⚠️ IMPORTANT – Sécurité des données

**NE JAMAIS pousser sur GitHub :**
- Les **données réelles** de la base (utilisateurs, familles, NumeroH, etc.)
- Les fichiers `config.env` ou `.env` (mots de passe, clés secrètes)
- Les dumps SQL contenant des données (`*.dump`, `*-dump.sql`)
- Le dossier `uploads/` (photos, documents des utilisateurs)

**Ce qui EST poussé (correct) :**
- Tout le code source (frontend, backend, IA)
- Les scripts de schéma/migration (structure des tables, sans données)
- Les fichiers `*.example` (config.env.example, etc.)
- La documentation, le cahier des charges

Le fichier `.gitignore` protège automatiquement les données sensibles.

---

## Étapes pour pousser sur GitHub

### 1. Créer un dépôt sur GitHub

1. Allez sur [github.com](https://github.com)
2. Cliquez sur **New repository**
3. Nom suggéré : `Les-enfants-d-Adam` ou `terre-adam`
4. Choisissez **Private** si vous voulez garder le code privé
5. Ne cochez pas "Add README" (le projet en a déjà)
6. Cliquez sur **Create repository**

### 2. Lier le projet et pousser

Ouvrez un terminal dans le dossier du projet et exécutez :

```bash
# Vérifier que tout est prêt
git status

# Ajouter tous les fichiers (le .gitignore exclut automatiquement les données sensibles)
git add .

# Vérifier ce qui sera envoyé (ne doit PAS contenir config.env, uploads/, dumps/)
git status

# Créer un commit
git commit -m "Projet complet - Les Enfants d'Adam / Terre ADAM"

# Si c'est la première fois, ajouter le dépôt distant
git remote add origin https://github.com/VOTRE-USERNAME/VOTRE-REPO.git

# Pousser sur GitHub
git push -u origin main
```

### 3. Commandes rapides (déjà connecté)

```bash
git add .
git commit -m "Votre message de mise à jour"
git push
```

---

## Vérification avant de pousser

Avant `git push`, vérifiez que ces éléments ne sont PAS dans le commit :

```bash
git status
```

Vous ne devez **pas** voir :
- `config.env`
- `backend/config.env`
- `uploads/`
- `backend/dumps/`
- `*.dump`

Si vous les voyez, le `.gitignore` ne fonctionne pas correctement.

---

## Fichiers de configuration (sans secrets)

Le projet contient des fichiers **exemple** qui peuvent être poussés :
- `backend/config.env.example` – template à copier en `config.env`
- `frontend/.env.production` – variables d'environnement (vérifier qu'il n'y a pas de secrets)

---

## Base de données en production

La base de données réelle (PostgreSQL) n'est **pas** dans les fichiers du projet. Elle est :
- Soit sur votre machine locale (localhost)
- Soit sur un service (Render, Neon, etc.)

Pour déployer, vous configurez `DATABASE_URL` dans les variables d'environnement du serveur. Les scripts de migration dans `backend/scripts/` et `backend/src/models/` permettent de créer la structure des tables sur une base vide.
