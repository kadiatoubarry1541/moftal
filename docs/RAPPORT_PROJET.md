# RAPPORT DU PROJET : LES ENFANTS D'ADAM
## Plateforme Communautaire Connectée, Unie et Sécurisée

---

## 1. VISION DU PROJET

**Les Enfants d'Adam** est une plateforme numérique complète qui vise à créer une **communauté connectée, unie et sécurisée**. Le projet répond à un besoin fondamental : reconnecter les membres d'une communauté dispersée (notamment la diaspora guinéenne) et centraliser tous les services essentiels en un seul endroit.

**Objectif principal :** Offrir un espace numérique où chaque membre peut gérer sa vie familiale, éducative, professionnelle, sanitaire, spirituelle et citoyenne de manière intégrée et sécurisée.

---

## 2. ARCHITECTURE TECHNIQUE

| Composant | Technologie | Rôle |
|-----------|-------------|------|
| Frontend | React 19 + TypeScript + Vite 7 | Interface utilisateur responsive |
| Backend | Node.js + Express.js | API RESTful |
| Base de données | PostgreSQL + Sequelize ORM | Stockage des données |
| IA Professeur | Python + Flask + OpenAI | Intelligence artificielle éducative |
| IA Diangou | React + Flask | Plateforme éducative dédiée |
| Style | Tailwind CSS | Design responsive (PC, tablette, mobile) |
| Authentification | JWT + bcrypt | Sécurité des comptes |

**Statistiques du projet :**
- **75+ modèles de données** couvrant toutes les relations
- **65+ pages frontend** pour tous les services
- **32 fichiers de routes API** pour une couverture complète
- **5 langues supportées** (Français, Anglais, Arabe, Maninka, Pular)

---

## 3. FONCTIONNALITES PROPOSEES

### 3.1 GESTION FAMILIALE & GENEALOGIE

**Objectif :** Préserver les liens familiaux et l'héritage généalogique.

- **Arbre généalogique interactif** : Visualisation et construction de l'arbre familial
- **NumeroH unique** : Identifiant universel attribué à chaque membre
- **Enregistrement des vivants** : Via formulaire écrit ou vidéo
- **Enregistrement des défunts** : Honorer la mémoire des ancêtres
- **Gestion des relations** :
  - Parents-enfants
  - Partenaires / Couples
  - Amitiés
- **Système d'invitation** : Inviter et vérifier les membres de la famille
- **Stories familiales** : Partager des moments et souvenirs

### 3.2 EDUCATION & FORMATION

**Objectif :** Démocratiser l'accès à l'éducation et à la formation.

- **Professeur IA** : Intelligence artificielle qui enseigne le français
  - Mode démo (fonctionne sans clé API)
  - Mode OpenAI (réponses avancées avec GPT)
  - Conjugaison automatique des verbes
  - Explication grammaticale
  - Enrichissement du vocabulaire
  - Apprentissage adaptatif (débutant à avancé)
- **Cours en ligne** : Catalogue de formations disponibles
- **Défis éducatifs** : Système de quiz et challenges gamifiés
- **Annuaire de professeurs** : Trouver un enseignant
- **Prise de rendez-vous** : Réserver un cours avec un professeur
- **Inscription aux formations** : S'inscrire à des programmes de formation
- **Suivi de progression** : Tableaux de bord pour étudiants et professeurs

### 3.3 SANTE & BIEN-ETRE

**Objectif :** Faciliter l'accès aux soins et aux produits de santé.

- **Gestion de la santé** : Suivi médical personnel
- **Echange de médicaments** : Marché de produits pharmaceutiques
- **Annuaire médical** : Répertoire des professionnels de santé (médecins, cliniques)
- **Informations hospitalières** : Base de données des hôpitaux et cliniques
- **Catalogue de produits de santé** : Produits médicaux disponibles
- **Rendez-vous médicaux** : Système de prise de rendez-vous avec les professionnels

### 3.4 COMMERCE & ECHANGES

**Objectif :** Créer un écosystème économique communautaire.

- **Echanges par catégorie** :
  - Produits primaires (agriculture, matières premières)
  - Produits secondaires (produits transformés)
  - Produits alimentaires
- **Espace professionnel** : Inscription et gestion des comptes professionnels
- **Types de professionnels** :
  - Cliniques et hôpitaux
  - Agences de sécurité
  - Journalistes
  - Entreprises
  - Ecoles et professeurs
  - Fournisseurs
  - Scientifiques
- **Annuaire professionnel** : Rechercher des professionnels par métier et localisation
- **Système de commandes** : Gestion des achats et ventes
- **Guide de l'entrepreneur** : Accompagnement pour créer son activité

### 3.5 FOI & SOLIDARITE

**Objectif :** Renforcer les valeurs spirituelles et la solidarité communautaire.

- **Gestion de la Zakat** :
  - Calcul transparent de la zakat
  - Gestion des donateurs
  - Suivi des bénéficiaires
  - Distribution équitable
- **Système de dons** :
  - Traitement sécurisé des donations
  - Gestion de campagnes de collecte
  - Génération de reçus
- **Communautés de foi** : Groupes religieux et événements
- **Bibliothèque religieuse** : Accès aux textes sacrés (Livres de Dieu)
- **Contenu spirituel** : Publications et réflexions de foi

### 3.6 ACTIVITES COMMUNAUTAIRES

**Objectif :** Animer la vie communautaire et créer du lien social.

- **Activités sportives** : Organisation d'événements sportifs
- **Activités artistiques** : Musique, théâtre, culture
- **Initiatives entrepreneuriales** : Projets collectifs
- **Groupes par critère** :
  - Par lieu de résidence
  - Par région géographique
  - Par organisation
  - Par type d'activité
- **Communication de groupe** : Messages, publications, coordination
- **Système de badges** : Récompenses et reconnaissance des contributions

### 3.7 GEOGRAPHIE & REGIONS

**Objectif :** Maintenir le lien avec les terres d'origine.

- **Vue d'ensemble de la Guinée** avec ses 4 régions naturelles :
  - **Basse-Guinée** : Informations, actualités, communauté locale
  - **Moyenne-Guinée (Fouta Djallon)** : Patrimoine culturel et communautaire
  - **Haute-Guinée** : Richesses et traditions
  - **Guinée Forestière** : Biodiversité et culture
- **Gestion des pays** : Suivi de la communauté dans le monde
- **Lieux de résidence** : Où vivent les membres de la communauté
- **Groupes régionaux** : Communication par zone géographique

### 3.8 DEMOGRAPHIE & IDENTITE

**Objectif :** Connaître et servir chaque membre de la communauté.

- **Section Femmes** : Espace dédié aux femmes de la communauté
- **Section Hommes** : Espace dédié aux hommes de la communauté
- **Gestion d'identité** : Profil complet avec NumeroH unique
- **Empreinte digitale** : Option de vérification biométrique
- **Profils détaillés** : Informations personnelles, familiales, professionnelles

### 3.9 SECURITE

**Objectif :** Protéger les membres et leurs données.

- **Authentification JWT** : Connexion sécurisée par token
- **Hachage des mots de passe** : Protection par bcrypt
- **Limitation de débit** : Protection contre les attaques par force brute
- **CORS sécurisé** : Contrôle des accès inter-domaines
- **Helmet.js** : Protection des en-têtes HTTP
- **Contrôle d'accès par rôle** : Admin, utilisateur, professionnel
- **Section sécurité dédiée** : Informations et outils de sécurité pour les membres

### 3.10 RELATION ETAT-CITOYEN

**Objectif :** Faciliter la communication entre les institutions et les citoyens.

- **Communication bidirectionnelle** : Echanges entre gouvernement et citoyens
- **Soumission de documents** : Envoi de pièces administratives
- **Gestion des requêtes** : Demandes administratives en ligne
- **Signalement d'erreurs** : Correction des informations
- **Traçabilité complète** : Audit de toutes les interactions

### 3.11 INTELLIGENCE ARTIFICIELLE

**Objectif :** Rendre l'éducation accessible à tous grâce à l'IA.

- **Professeur IA (IA SC)** : Serveur Python/Flask dédié à l'enseignement du français
  - Intégration OpenAI GPT-3.5-turbo
  - Mode démo avec 52+ réponses pré-construites
  - Calculs mathématiques automatiques
  - Historique des conversations
  - 5 modes de fonctionnement
- **IA Diangou** : Plateforme éducative dédiée
  - Base de connaissances (alphabet, salutations, conjugaison, grammaire, vocabulaire, nombres)
  - Détection automatique des questions par mots-clés
  - Tableau de bord professeur
  - Suivi des conversations pour analyse

### 3.12 ADMINISTRATION

**Objectif :** Gérer et modérer la plateforme efficacement.

- **Tableau de bord admin** : Vue d'ensemble de la plateforme
- **Gestion des utilisateurs** : Modération et administration des comptes
- **Gestion des badges** : Création et attribution de récompenses
- **Administration gouvernementale** : Gestion des entités étatiques
- **Modération de contenu** : Contrôle des publications
- **Statistiques** : Analyses et métriques de la plateforme
- **Validation des comptes pro** : Workflow d'approbation des professionnels

---

## 4. SYSTEME DE NOTIFICATIONS

- Notification de rendez-vous accepté/refusé
- Notification de compte professionnel approuvé/rejeté
- Notification de nouveau rendez-vous
- Notifications générales
- Suivi lu/non-lu
- Cloche de notification en temps réel

---

## 5. MULTILINGUE

La plateforme supporte **5 langues** pour une accessibilité maximale :

| Langue | Code | Audience |
|--------|------|----------|
| Français | fr | Langue principale |
| Anglais | en | Diaspora anglophone |
| Arabe | ar | Communauté arabophone |
| Maninka | man | Ethnie Malinké |
| Pular | pu | Ethnie Peul |

---

## 6. DESIGN RESPONSIVE

La plateforme est optimisée pour tous les appareils :

- **PC / Desktop** : Interface complète avec navigation latérale
- **Tablette** : Mise en page adaptée avec menus dépliants
- **Mobile** : Interface tactile avec boutons accessibles
- **Safe-area** : Support des écrans avec encoche
- **Mode sombre/clair** : Thème personnalisable

---

## 7. RESUME DES MODULES

| Module | Pages | Description |
|--------|-------|-------------|
| Famille & Généalogie | 9+ | Arbre familial, relations, mémoire |
| Education | 6+ | Cours, IA, défis, formations |
| Santé | 3+ | Soins, médicaments, annuaire médical |
| Commerce | 6+ | Echanges, espace pro, commandes |
| Foi & Solidarité | 5+ | Zakat, dons, textes sacrés |
| Activités | 4+ | Sport, art, entrepreneuriat |
| Géographie | 6+ | Régions de Guinée, diaspora |
| Démographie | 3+ | Hommes, femmes, identité |
| Sécurité | 1+ | Protection et sûreté |
| Etat-Citoyen | 2+ | Communication institutionnelle |
| IA | 2+ | Professeur IA, Diangou |
| Admin | 3+ | Gestion, modération, statistiques |

---

## 8. PROPOSITION DE VALEUR

### Pour une communauté CONNECTEE :
- Arbre généalogique numérique reliant les familles
- Groupes par région, résidence et organisation
- Communication instantanée entre membres
- Annuaire professionnel et prise de rendez-vous
- Système de notifications en temps réel

### Pour une communauté UNIE :
- Activités communautaires partagées (sport, art, entrepreneuriat)
- Echanges commerciaux solidaires
- Education accessible à tous via l'IA
- Préservation de l'héritage culturel et historique
- Support multilingue pour inclure tous les membres

### Pour une communauté SECURISEE :
- Identifiant NumeroH unique et vérifiable
- Authentification forte (JWT + bcrypt)
- Contrôle d'accès par rôle
- Protection contre les attaques (rate limiting, CORS, Helmet)
- Traçabilité complète des actions
- Vérification biométrique optionnelle

---

## 9. DONNEES ET MODELES

Le système repose sur **75+ modèles de données** organisés en :

- **Utilisateurs** : User, ProfessionalAccount, Professor, Doctor, SecurityAgent, Supplier
- **Famille** : DeceasedMember, ParentChildLink, CoupleLink, Friendship, FamilyTree
- **Education** : Course, Formation, ProfessorRequest, IaKnowledge, IaConversation
- **Commerce** : ExchangeProduct, Order, HealthProduct
- **Foi** : FaithContent, FaithCommunity, HolyBook
- **Communauté** : ActivityGroup, OrganizationGroup, RegionGroup, ResidenceGroup
- **Contenu** : Document, PublishedStory, SciencePost, RealityPost
- **Administration** : Government, Badge, PageAdmin, Notification
- **Gamification** : Game, GameQuestion, GameAnswer, GamePlayer

---

## 10. SCRIPTS DE LANCEMENT

| Script | Fonction |
|--------|----------|
| LANCER.bat | Démarrer tous les composants |
| LANCER_BACKEND.bat | Backend uniquement |
| LANCER_FRONTEND.bat | Frontend uniquement |
| LANCER_IA_PROFESSEUR.bat | Serveur IA uniquement |
| DEMARRER_TOUT_AVEC_IA.bat | Tout avec l'IA |
| DIAGNOSTIC_IA.bat | Diagnostic de l'IA |

---

## 11. CONCLUSION

**Les Enfants d'Adam** est une plateforme ambitieuse et complète qui propose une solution intégrée pour :

1. **Reconnecter** les familles dispersées grâce à la généalogie numérique
2. **Eduquer** grâce à l'intelligence artificielle et aux formations en ligne
3. **Soigner** en facilitant l'accès aux professionnels et produits de santé
4. **Commercer** via un écosystème d'échanges solidaires
5. **Solidariser** par la gestion transparente de la zakat et des dons
6. **Animer** la vie communautaire par les activités et groupes
7. **Protéger** les membres par une sécurité robuste
8. **Préserver** l'héritage culturel et historique

Cette plateforme incarne la vision d'une communauté moderne qui reste fidèle à ses racines tout en embrassant les technologies du futur.

---

*Rapport généré le 13 février 2026*
*Projet : Les Enfants d'Adam - Plateforme Communautaire*