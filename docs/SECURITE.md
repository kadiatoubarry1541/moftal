# 🔒 Guide de Sécurité

Ce document explique les pratiques de sécurité mises en place dans ce projet.

## ✅ Corrections de Sécurité Appliquées

### 1. Mots de passe dans les variables d'environnement
Les mots de passe ne sont plus hardcodés dans le code source. Ils sont maintenant stockés dans le fichier `backend/config.env` qui est ignoré par Git.

**Fichiers corrigés :**
- `backend/scripts/initAdmin.js`
- `backend/scripts/verifyAdmin.js`

**Configuration requise :**
Ajoutez ces lignes dans votre fichier `backend/config.env` :
```env
ADMIN_PASSWORD=votre_mot_de_passe_securise
ADMIN_NUMERO_H=G0C0P0R0E0F0 0
```

### 2. Protection contre XSS (Cross-Site Scripting)
Remplacement de `innerHTML` par `textContent` pour éviter l'injection de code malveillant.

**Fichiers corrigés :**
- `frontend/src/pages/MonProfil.tsx`
- `frontend/src/pages/Inscription.tsx`

### 3. Protection des secrets
Le fichier `backend/config.env` contient vos secrets et **NE DOIT JAMAIS** être commité dans Git.

**Protection en place :**
- ✅ Fichier listé dans `.gitignore`
- ✅ Fichier `config.env.example` créé comme modèle
- ✅ Tous les secrets dans des variables d'environnement

## 🛡️ Mesures de Sécurité Déjà en Place

### Sécurité Backend
- ✅ **Helmet.js** : Protection des en-têtes HTTP
- ✅ **CORS** : Origines autorisées restreintes
- ✅ **Rate Limiting** : Protection contre les attaques par force brute (100 req/15min)
- ✅ **Bcrypt** : Hashage des mots de passe (12 rounds)
- ✅ **JWT** : Authentification sécurisée
- ✅ **Sequelize ORM** : Protection automatique contre les injections SQL
- ✅ **Express Validator** : Validation des entrées utilisateur
- ✅ **Multer** : Upload de fichiers sécurisé avec validation

### Bonnes Pratiques
- ✅ Variables d'environnement pour les secrets
- ✅ Validation des entrées utilisateur
- ✅ Requêtes paramétrées (via Sequelize)
- ✅ Pas d'utilisation de `eval()`, `exec()` ou `Function()`

## 🚀 Configuration Initiale

### 1. Configuration de la base de données
```bash
cd backend
cp config.env.example config.env
# Modifiez config.env avec vos vraies valeurs
```

### 2. Initialisation du compte administrateur
```bash
npm run init-admin
```

### 3. Vérification de la configuration
```bash
npm run verify-admin
```

## ⚠️ Important en Production

1. **Changez TOUS les secrets** dans `config.env` :
   - `ADMIN_PASSWORD` : Utilisez un mot de passe fort
   - `JWT_SECRET` : Générez une clé aléatoire longue
   - `DB_PASSWORD` : Mot de passe de base de données sécurisé

2. **Configurez NODE_ENV** :
   ```env
   NODE_ENV=production
   ```

3. **Utilisez HTTPS** en production

4. **Sauvegardez régulièrement** votre base de données

5. **Mettez à jour les dépendances** régulièrement :
   ```bash
   npm audit
   npm update
   ```

## 📝 Vérification de Sécurité

Pour vérifier que vos secrets ne sont pas exposés :

```bash
# Vérifier que config.env n'est pas tracké par Git
git check-ignore -v backend/config.env

# Vérifier qu'aucun secret n'est dans le code
git grep -i "password.*=" --and --not -e "process.env"
```

## 🆘 En cas de Fuite de Secrets

Si vous avez accidentellement commité des secrets dans Git :

1. **Changez IMMÉDIATEMENT tous les secrets exposés**
2. Nettoyez l'historique Git (utilisez BFG Repo-Cleaner ou git-filter-repo)
3. Vérifiez tous les services qui utilisaient ces secrets
4. Informez votre équipe

## 📚 Ressources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
