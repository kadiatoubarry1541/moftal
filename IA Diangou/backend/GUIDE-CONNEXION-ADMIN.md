# 🔐 Guide de connexion Admin

## Vérification de la base de données

### Étape 1 : Vérifier que PostgreSQL est démarré

**PowerShell :**
```powershell
Get-Service -Name "postgresql*"
```

Si le service n'est pas "Running", démarrez-le :
```powershell
Start-Service -Name "postgresql-x64-16"  # Adaptez la version
```

### Étape 2 : Vérifier la configuration

Ouvrez `backend/config.env` et vérifiez :
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=diangou
DB_USER=postgres
DB_PASSWORD=votre_mot_de_passe  # ⚠️ IMPORTANT : Mettez votre mot de passe PostgreSQL
```

### Étape 3 : Créer/Vérifier le compte admin

**Option A : Utiliser le script automatique**
```bash
cd backend
node scripts/createAdmin.js
```

**Option B : Utiliser le script de vérification**
```bash
cd backend
node verifier-et-creer-admin.js
```

### Étape 4 : Démarrer le serveur backend

```bash
cd backend
npm run start
```

Vous devriez voir :
```
✅ PostgreSQL connecté avec succès à la base de données "diangou"
✅ Base de données connectée et prête
🚀 Serveur IA Diangou démarré sur le port 5003
```

### Étape 5 : Se connecter sur le frontend

1. Ouvrez votre navigateur : `http://localhost:5173` (ou le port de votre frontend)
2. Cliquez sur "Se connecter"
3. Entrez :
   - **Email** : `kadiatou1541.kb@gmail.com`
   - **Mot de passe** : `(celui défini dans ADMIN_PASSWORD)`

## Si ça ne fonctionne pas

### Problème : "Base de données non connectée"

**Solutions :**
1. Vérifiez que PostgreSQL est démarré
2. Vérifiez le mot de passe dans `config.env`
3. Créez la base de données si elle n'existe pas :
   ```sql
   CREATE DATABASE diangou;
   ```

### Problème : "Token manquant"

**Solutions :**
1. Vérifiez que le serveur backend est démarré
2. Vérifiez les logs du serveur pour voir les erreurs
3. Vérifiez que JWT_SECRET est défini dans `config.env`

### Problème : "Email ou mot de passe incorrect"

**Solutions :**
1. Exécutez le script de création admin :
   ```bash
   cd backend
   node scripts/createAdmin.js
   ```
2. Vérifiez que l'utilisateur existe dans la base de données

## Vérification manuelle dans PostgreSQL

Si vous avez accès à pgAdmin ou psql :

```sql
-- Se connecter à la base diangou
\c diangou

-- Vérifier si l'utilisateur existe
SELECT numeroH, email, role, "isActive" FROM users WHERE email = 'kadiatou1541.kb@gmail.com';

-- Si l'utilisateur n'existe pas ou n'est pas admin, créez-le :
-- (Utilisez plutôt le script createAdmin.js qui hash le mot de passe correctement)
```

## Commandes rapides

```bash
# Vérifier la base de données
cd backend
node verifier-et-creer-admin.js

# Créer/Mettre à jour l'admin
cd backend
node scripts/createAdmin.js

# Démarrer le serveur
cd backend
npm run start
```

