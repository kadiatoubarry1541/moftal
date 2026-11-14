# Cahier des charges complet – Projet VIVASAR

Ce document décrit de façon opérationnelle et reproductible tout ce qu’il faut pour régénérer exactement la structure et les comportements actuels du projet (frontend + backend), afin que toute personne ou IA puisse recréer le même résultat.

**IMPORTANT**
Ce cahier de charges décrit de manière fidèle la structure, le contenu, la navigation et l’apparence des pages et formulaires du projet tels qu’ils existent dans les captures et dans la base code actuelle. Toute divergence dans le nombre, l’intitulé, l’ordre ou la présence de pages, sous-pages, champs, boutons, menus, sous-menus, labels ou langues, tout oubli d’un formulaire ou d’une traduction par rapport à la structure décrite doit être considéré comme une erreur. Le résultat attendu est une reproduction totale à l’identique sur tous les aspects visible à l'utilisateur.

## 1) Objectifs et périmètre
- Créer une application web avec un frontend React + TypeScript (Vite) et un backend Node.js + Express + Sequelize + PostgreSQL.
- Disposer d’un compte administrateur principal unique et d’authentification par NumeroH + mot de passe.
- Structurer le frontend en 2 grandes pages d’entrée après connexion, donnant accès à 15 sous-pages thématiques.
- Exposer des APIs REST pour l’authentification, l’administration et les domaines fonctionnels (activités, résidences, éducation, etc.).

## 2) Architecture technique
- Frontend: React 18, TypeScript, Vite, CSS modules/fichiers `.css` locaux, i18n minimal custom.
- Backend: Node.js (ESM), Express, Sequelize (PostgreSQL), Helmet, CORS, Rate Limit, Multer (upload), JWT.
- Base de données: PostgreSQL (nom par défaut `enfants_adam_eve`).
- Communication: HTTP/JSON; frontend consomme les endpoints `/api/*`.

## 3) Arborescence des dossiers à reproduire
```
frontend/
  index.html
  package.json
  vite.config.ts
  src/
    main.tsx
    App.tsx
    index.css
    assets/react.svg
    components/
      Activite.css
      ActivityCommunity.tsx
      ActivityGroups.tsx
      ActivitySelector.tsx
      AdminPanel.tsx
      ArbreGenealogique.css
      ArbreGenealogique.tsx
      BadgeManager.tsx
      BadgeSystem.tsx
      Banner.tsx
      ButtonDonEducation.tsx
      ButtonDons.tsx
      ButtonDonSante.tsx
      ButtonDonZaka.tsx
      CommunicationHub.tsx
      DebugInfo.tsx
      EchangesProfessionnel.tsx
      Education.css
      Education.tsx
      EncoreMange.css
      EncoreMange.tsx
      Etat.tsx
      FamilyTree.tsx
      FamilyTreeNode.tsx
      FingerprintScanner.tsx
      FloatingDonations.tsx
      FloatingMessenger.tsx
      Foi.tsx
      FoiSections.tsx
      G96Diagnostic.tsx
      IdentiteModal.tsx
      inputs.tsx
      InvitationsReceived.css
      InvitationsReceived.tsx
      InviterMembres.tsx
      LieuxExchange.tsx
      LieuxResidence.css
      LieuxResidence.tsx
      Marcher.css
      Marcher.tsx
      MediaReactions.tsx
      MediaUploader.tsx
      MemberInvitation.tsx
      MesParents.tsx
      MonPartenaire.tsx
      NumeroHChecker.tsx
      Pays.css
      Pays.tsx
      PublicationManager.tsx
      SectionDons.tsx
      Securite.css
      SocialGroups.tsx
      ui/index.tsx
      VideoRecorder.tsx
    config/api.ts
    i18n/{I18nContext.ts,I18nProvider.tsx,strings.ts,useI18n.ts}
    pages/  (voir 4.2)
    services/apiService.ts
    styles/{colors.ts,globals.css}
    types/{common.ts,invitation.ts}
    utils/*.ts

backend/
  package.json
  config.env    (variables d’environnement)
  config.js
  eslint.config.js
  public/vite.svg
  src/
    server.js
    server-fixed.js
    config/database.js
    middleware/{auth.js,upload.js}
    models/*.js       (inclut User.js détaillé ci-dessous)
    routes/
      activities.js
      additional.js
      admin.js
      auth.js
      badges.js
      documents.js
      education.js
      exchange.js
      faith.js
      friends.js
      logos.js
      organizations.js
      regions.js
      residences.js
  uploads/{photos/,videos/}
```

## 4) Spécifications Frontend

### 4.1 Authentification côté UI
- L’utilisateur se connecte par NumeroH + mot de passe.
- Après connexion réussie, redirection vers `/compte` (UserDashboard).

### 4.2 Pages et routes React (post-login)
- **PAGE 1 – UserDashboard** (`/compte`) : après connexion (login), l'utilisateur voit une carte profil résumée (avatar + nom + NuméroH + rôle), un bouton « MOI », et 7 tuiles/pages accessibles :

1. Lieux de résidence (`/lieux-residence`) – `LieuxResidence.tsx`
2. Organisation (`/organisation`) – `Organisation.tsx`
3. Pays (`/pays`) – `Pays.tsx`
4. Activité (`/activite`) – `Activite.tsx`
5. Éducation (`/education`) – `Education.tsx`
6. Foi (`/foi`) – `Foi.tsx`
7. Échanges (`/echange`) – `Echange.tsx` (+ éventuellement pages primaire/secondaire/tertiaire)

Exemple de rendu/type contenu de la carte :
- [Avatar rond avec initiale U]
- "Utilisateur administrateur"
- Badge "Administrateur"
- NuméroH: G0C0P0R0E0F0 0
- Bouton vert : MOI
- 7 tuiles alignées (voir capture fournie)

- **PAGE 2 – Moi** (`/moi`) : accessible via le bouton "MOI" sur UserDashboard. En haut, bouton "← Retour" vers `/compte`. On retrouve :
    - La carte profil résumé comme sur `/compte`,
    - 3 boutons sous la carte (Inviter, Mon profil, Admin [couronne]),
    - 7 tuiles/pages accessibles :

1. Santé (`/sante`) – `Sante.tsx`
2. Famille (`/famille`) – dossier `pages/famille/` (Arbre, Parents, Enfants, Membres, Partenaire)
3. Mes amours (`/mes-amours`) – `MesAmours.tsx`
4. Zaka et Dons (`/zaka-dons`) – `ZakaEtDons.tsx`
5. Sécurité (`/securite`) – `Securite.tsx` + `Securite.css`
6. Histoire (`/histoire`) – `Histoire.tsx`
7. États (`/etats`) – `Etats.tsx`

**Notes importantes :**
- Chaque tuile affiche une icône et le nom de la page.
- Le découpage navigable constaté : 7 tuiles sur `/compte`, 7 sur `/moi`, non pas 15 sur Moi !
- L'ensemble de ces 14 pages thématiques (+ profils/actions) constitue l'ensemble de la navigation post-login.
- Le design doit préserver ce découpage UX/UI distinct entre la page connectée et la page Moi.

### 4.3 Internationalisation et formulaires obligatoires
- Tous les écrans et formulaires présents dans l’application (accueil, connexion, inscription/sous-inscription vivant/défunt, pages user, MOI, profil, settings) doivent être intégralement traduits et utilisables dans les 5 langues suivantes : français (fr), anglais (en), arabe (ar), mandinka (man), pular (pul).
- Les contenus suivants sont concernés : labels de champs, titres, boutons, sous-titres, valeurs d’options, messages d’erreur ou de succès, placeholders, instructions ou aides contextuelles.
- Les choix/options de chaque champ du formulaire doivent être accessibles et traduits : genre (Homme/Femme/Autre), statuts sociaux, pays/région, toutes listes déroulantes.
- Le sélecteur de langue (menu « Lang ») permet à tout instant de changer la langue de tout l’affichage et tous les formulaires, dynamiquement, sans rechargement.
- Cette internationalisation (i18n) s’impose sur :
  - formulaire d’inscription (+ tous sous-formulaires/wizards vivant/défunt)
  - formulaire de connexion
  - page d’accueil
  - navigation et menus
  - toutes les pages-user (tableaux, états, profil, boutons d'action)
  - messages, erreurs, boutons, aides, info-bulles
- Toute page ou fonctionnalité qui ne respecte pas cet affichage multilingue pour tous ses champs est considérée comme non conforme.

**EXPLICITATION :**
La base telle que codée et telle que documentée dans ce cahier comporte plus de 80 champs, options ou labels distincts à traduire. Toutes les structures de formulaire (ex : Account, Inscription, InscriptionFormation, Identite, toute la famille vivant/défunt, Wizard multi-étapes, etc.) ainsi que la navigation (accueil, login, register, etc.) et l’affichage utilisateur doivent être exhaustivement couverts par ce système de langue.

## 5) Spécifications Backend

### 5.1 Démarrage et sécurité
- `src/server.js`
  - Helmet activé.
  - CORS autorise origines localhost (5173…5179) et `config.FRONTEND_URL` si défini.
  - Rate limiting 100 req/15 min.
  - JSON body limit 10MB.
  - Fichiers statiques sous `/uploads`.

### 5.2 Variables d’environnement (fichier `backend/config.env`)
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=enfants_adam_eve
DB_USER=postgres
DB_PASSWORD=<votre_mot_de_passe>
JWT_SECRET=<secret>
JWT_EXPIRE=7d
BCRYPT_ROUNDS=12
PORT=5001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
```

### 5.3 Modèle User – clé fonctionnelle
- Fichier: `backend/src/models/User.js` (Sequelize, table `users`).
- Clé primaire: `numeroH` (STRING, `field: 'numero_h'`).
- Champs principaux: `password` (hashé), `type` ('vivant' par défaut), `prenom`, `nomFamille`, `genre` ('AUTRE' par défaut), infos familiales, géographiques, sociales, santé, médias, métriques famille, activités, résidences, `isActive`, `isVerified`, `role` ('user' par défaut), `children`, `parents`, `lastLogin`.
- Méthodes utiles: `findByNumeroH(numeroH)` (normalisation des espaces), `getAge()`.

### 5.4 Comptes et rôles
- Compte admin principal (référencé par middlewares) :
  - NumeroH: `G0C0P0R0E0F0 0` – rôle: `super-admin`.
  - Mot de passe : `Neneyaya1` (à affecter lors de la création initiale du projet)
- Un compte de test pouvait être créé par `auth.js` (NumeroH `G96C1P2R3E2F1 4`, mdp `test123`), mais la base actuelle ne conserve désormais QUE l’admin principal (tous les autres comptes ont été supprimés).
- Rôles: `user`, `admin`, `super-admin`.
  - Middlewares: `authenticate`, `requireAdmin`, `requireSuperAdmin`, `requireMasterAdmin`, `bypassAllRestrictions`.

### 5.5 Endpoints REST (extraits clefs)
- Auth (`/api/auth`):
  - `POST /register` – crée un utilisateur (hash bcrypt, validations `express-validator`).
  - `POST /login` – login par `numeroH` + `password`, renvoie JWT.
  - `GET /me` – placeholder d’auth.
  - `POST /logout` – placeholder.
- Admin (`/api/admin`) – gestion utilisateurs, stats, recherche (accès admin/super-admin).
- Domaines: `/api/activities`, `/api/residences`, `/api/education`, `/api/regions`, `/api/organizations`, `/api/faith`, `/api/friends`, `/api/exchange`, `/api/documents`, `/api/badges`, `/api/logos`, `/api` (additional).
- Healthcheck: `GET /api/health`.

### 5.6 Connexion BDD
- `src/config/database.js`: Sequelize Postgres; en `NODE_ENV=development`, `sequelize.sync({ alter: true })`.

## 6) Règles fonctionnelles clés
- Authentification obligatoire pour les routes protégées via JWT dans le header `Authorization: Bearer <token>`.
- L’admin principal `G0C0P0R0E0F0 0` possède tous les droits.
- NumeroH doit être comparé en neutralisant les espaces superflus (voir `User.findByNumeroH`).

## 7) Instructions d’installation et d’exécution
1. Prérequis: Node.js 18+, PostgreSQL 14+.
2. Base de données: créer la base `enfants_adam_eve` et configurer `backend/config.env`.
3. Backend:
   - `cd backend`
   - `npm install`
   - `node src/server.js`
   - Serveur sur `http://localhost:5001`
4. Frontend:
   - `cd frontend`
   - `npm install`
   - `npm run dev`
   - Application sur `http://localhost:5173`

## 8) Critères d’acceptation
- Après login, l’utilisateur est redirigé vers `/compte` puis peut accéder à `/moi` et aux 15 pages listées.
- Les endpoints d’auth fonctionnent (inscription, connexion, JWT valide, `lastLogin` mis à jour à la connexion).
- La base contient uniquement le compte administrateur principal (sauf si des utilisateurs sont volontairement créés via l’API).
- Les en-têtes de sécurité (Helmet) et CORS sont actifs.

## 9) Bonnes pratiques et contraintes
- Code ESM (import/export) côté backend; pas de `require`.
- Hash de mot de passe avec `bcrypt` (rounds = `BCRYPT_ROUNDS`).
- Ne pas committer de secrets; utiliser `config.env` local.
- Respecter la structure des dossiers et noms de fichiers listés plus haut pour garantir la reproduction exacte.

## 10) Données minimales
- Compte administrateur principal présent dans la base avec :
  - NumeroH `G0C0P0R0E0F0 0`
  - Mot de passe `Neneyaya1`
  - rôle `super-admin`
- Dossiers `uploads/photos` et `uploads/videos` existants (peuvent être vides).

---
### 4.4 Détail exhaustif des sous-pages et arborescence Frontend

Pour que toute sous-page ou composant soit reproduit, voici le mapping précis des sous-pages à intégrer pour chaque tuile principale :

**Famille :**
  - famille/Arbre.tsx (arbre généalogique visuel)
  - famille/Parents.tsx
  - famille/Enfants.tsx
  - famille/Membres.tsx
  - famille/Partenaire.tsx
  - Famille.tsx

**Histoire :**
  - Antiquite.tsx
  - Prehistoire.tsx
  - Histoire.tsx (page principale)

**Échange/Echanges :**
  - Echange.tsx (accueil/choix)
  - EchangePrimaire.tsx
  - EchangeSecondaire.tsx
  - EchangeTertiaire.tsx

**Lieux de résidence :**
  - LieuxResidence.tsx (accueil)
  - LieuResidence1.tsx
  - LieuResidence2.tsx
  - LieuResidence3.tsx

**Deceased/Living:**
  - deceased/DeceasedChoice.tsx
  - deceased/DeceasedFamilyCheck.tsx
  - deceased/DeceasedVideoRegistration.tsx
  - deceased/DeceasedWizard.tsx
  - deceased/DeceasedWrittenForm.tsx
  - living/LivingChoice.tsx
  - living/LivingWizard.tsx
  - living/VideoRegistration.tsx

(Cette liste doit être utilisée comme référence stricte pour la reproduction exacte de l’arborescence frontend.)


---
### 5.7 Génération automatique du NumeroH et contrôle d'unicité

- Le champ `NumeroH` de chaque utilisateur est généré automatiquement selon une combinaison de règles métier (par exemple, concaténation de codes pour la génération, famille, prénom, etc.), garantissant unicité et structure reproductible. La logique de génération suit celle du projet actuel : respecter la même suite de lettres, chiffres et séparateurs (voir code existant), normalisation automatique des espaces et majuscules.
- Toute sauvegarde ou recherche sur ce champ doit appliquer la fonction de normalisation décrite dans la méthode statique `User.findByNumeroH` du modèle backend.
- Ce champ est la clef primaire et tout doublon provoque une erreur.
- (Adapter la logique précise de génération d’après le code métier implanté actuel en cas de souci.)


---
### 5.8 Champs et données calculés/automatiques

- Certains champs dans les modèles et formulaires sont déduits/calculés automatiquement par le système :
  - `age` est calculé depuis `dateNaissance` à chaque modification et sauvegarde (hook Sequelize `beforeSave`)
  - `generation` : peut être auto-déduite d’une logique métier (par exemple à partir de l’année de naissance ou du NumeroH)
  - `statutSocial`, `isActive` : valeurs par défaut au moment de la création
  - `children`, `parents` : stockés comme JSON dynamiquement liés
  - Champs d’incrémentation et "auto" : années calculées (depuis décès, avant naissance, etc.), génération, calcul d’âge d’après date, etc.
- Aucune de ces valeurs ne doit pouvoir être oubliée ni écrasée par erreur lors d’une édition manuelle.
- Toute conversion (ex. : date texte => number) suit strictement le schéma et les hooks du projet.

(En résumé, tous les calculs dynamiques/automatiques ou propagations sont à documenter et à respecter.)

---
Ce cahier de charges est suffisant pour confier le projet à une tierce personne/IA et obtenir strictement la même structure et le même comportement.

