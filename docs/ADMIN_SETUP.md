# 🔧 Configuration du Compte Administrateur

Ce document explique comment configurer et gérer le compte administrateur principal du système.

## 📋 Informations du Compte Administrateur

- **NumeroH**: `G0C0P0R0E0F0 0`
- **Mot de passe**: `(celui défini dans ADMIN_PASSWORD)`
- **Rôle**: `super-admin`
- **Prénom**: Administrateur
- **Nom**: Principal

## 🚀 Initialisation du Compte

Pour créer ou mettre à jour le compte administrateur, exécutez :

```bash
cd backend
npm run init-admin
```

Ce script va :
- ✅ Vérifier si le compte existe
- ✅ Créer le compte s'il n'existe pas
- ✅ Mettre à jour le mot de passe si nécessaire
- ✅ S'assurer que le rôle est `super-admin`
- ✅ Activer le compte

## 🔍 Vérification du Compte

Pour vérifier que le compte administrateur est correctement configuré :

```bash
cd backend
npm run verify-admin
```

Ce script vérifie :
- ✅ L'existence du compte
- ✅ La validité du mot de passe
- ✅ Le rôle (super-admin)
- ✅ L'état actif du compte

## 🔐 Connexion en tant qu'Administrateur

### Via l'interface web

1. Allez sur la page de connexion
2. Entrez le NumeroH : `G0C0P0R0E0F0 0`
3. Entrez le mot de passe : `(celui défini dans ADMIN_PASSWORD)`
4. Cliquez sur "Se connecter"

### Via l'API

```bash
curl -X POST http://localhost:5002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "numeroH": "G0C0P0R0E0F0 0",
    "password": "(celui défini dans ADMIN_PASSWORD)"
  }'
```

## 🛡️ Privilèges Administrateur

Le compte administrateur principal (`G0C0P0R0E0F0 0`) a accès à :

- ✅ Toutes les routes administrateur
- ✅ Gestion des utilisateurs
- ✅ Gestion du contenu
- ✅ Gestion du système
- ✅ Bypass de toutes les restrictions
- ✅ Accès à toutes les données

## 🔧 Dépannage

### Le compte n'existe pas

```bash
npm run init-admin
```

### Le mot de passe ne fonctionne pas

```bash
npm run init-admin
```

Cela réinitialisera le mot de passe.

### Le compte est désactivé

```bash
npm run init-admin
```

Cela réactivera le compte.

### Vérifier la configuration

```bash
npm run verify-admin
```

## 📝 Notes Importantes

- ⚠️ **Sécurité**: Changez le mot de passe par défaut en production
- ⚠️ **Base de données**: Assurez-vous que la base de données est accessible
- ⚠️ **Variables d'environnement**: Vérifiez que `config.env` est correctement configuré

## 🆘 Support

Si vous rencontrez des problèmes :

1. Vérifiez la connexion à la base de données
2. Exécutez `npm run verify-admin` pour diagnostiquer
3. Consultez les logs du serveur pour plus de détails
