# Cahier des charges – Plateforme « Les Enfants d'Adam » / Terre ADAM

**Version :** 1.1  
**Projet :** Plateforme communautaire guinéenne – « 1 »  
**Document :** Spécifications fonctionnelles et techniques consolidées  
**Dernière mise à jour :** Conforme au contenu actuel du site

---

## Sommaire

1. [Contexte et objectifs](#1-contexte-et-objectifs)
2. [Rôles et types d'utilisateurs](#2-rôles-et-types-dutilisateurs)
3. [Architecture fonctionnelle et modules](#3-architecture-fonctionnelle-et-modules)
4. [Portail général, authentification et profil](#4-portail-général-authentification-et-profil)
5. [Module Famille et liens de sang](#5-module-famille-et-liens-de-sang)
6. [Module Amis et communauté](#6-module-amis-et-communauté)
7. [Pages thématiques (Santé, Éducation, Science, Sécurité, Activités)](#7-pages-thématiques)
8. [Module Solidarité (Dons, Zaka, Livres de Dieu, Réalité, ONG)](#8-module-solidarité)
9. [Terre ADAM, lieux de résidence et quartiers](#9-terre-adam-lieux-de-résidence-et-quartiers)
10. [Espace professionnel, rendez-vous et notifications](#10-espace-professionnel-rendez-vous-et-notifications)
11. [Régions, pays, gouvernements et organisations](#11-régions-pays-gouvernements-et-organisations)
12. [Échanges (marchés, produits, fournisseurs)](#12-échanges)
13. [IA (Professeur IA, connaissances, conversations)](#13-ia)
14. [Histoire, éducation avancée, badges et gamification](#14-histoire-éducation-badges-et-gamification)
15. [Administration globale](#15-administration-globale)
16. [Exigences techniques (stack, API, sécurité)](#16-exigences-techniques)
17. [Règles transverses (formulaires, UX, accessibilité)](#17-règles-transverses)

---

## 1. Contexte et objectifs

### 1.1 Objectif général

Créer une **plateforme web centralisée** pour :

- **Informer, éduquer et accompagner** les habitants (toutes religions confondues).
- **Mettre en relation** le public avec des professionnels (santé, éducation, science, sécurité, fournisseurs, ONG).
- **Organiser la solidarité** : aide aux pauvres, dons, zakat, rendez-vous, messages.
- **Préserver les liens familiaux** : arbre généalogique, membres vivants et défunts, hommages.
- **Centraliser les services** : échanges commerciaux, santé, éducation, foi, activités sociales, workflow État–citoyen.

### 1.2 Public cible

| Public | Description |
|--------|-------------|
| **Grand public** | Utilisateurs simples (famille, solidarité, contenus, rendez-vous). |
| **Professionnels** | Cliniques, écoles, scientifiques, fournisseurs, journalistes, ONG (après validation admin). |
| **Administrateurs** | Gestion des contenus, validations, gouvernements, badges, modération. |

### 1.3 Contexte géographique et culturel

- Focus **Guinée** (Basse Guinée, Fouta Djallon, Haute Guinée, Guinée forestière) et **diaspora**.
- **Multilingue** : français, anglais, arabe, maninka, pular (i18n).
- **NumeroH** : identifiant unique par membre pour traçabilité et lien familial.

---

## 2. Rôles et types d'utilisateurs

### 2.1 Visiteur non connecté

- Consulter la **page d'accueil** (Home) : boutons « S'inscrire » et « Se connecter ».
- **S'inscrire** → redirection vers `/vivant` (parcours vivant).
- Accès limité aux contenus publics.
- **Redirection** vers connexion pour les fonctionnalités complètes.

### 2.2 Utilisateur connecté (compte standard)

- **Profil** : modifier identité, photo, lieux de résidence (1 à 3 quartiers), contacts.
- **Tableau de bord** (UserDashboard) : onglets Terre ADAM, Activité, Échanges, Temps (Histoire), Science, Éducation ; liens Famille, Solidarité, Santé, Sécurité.
- **Page d'accueil favorite** : choix parmi les sections principales.
- **Professionnels/ONG** : consulter les listes approuvées, prendre rendez-vous, envoyer des messages.
- **Solidarité** : voir la liste des personnes à aider, faire un don, consulter « Mes dons ».
- **Famille** : gérer sa famille, arbre généalogique (section Moi → Mon arbre), fiches vivants/défunts.
- **Contenus** : livres saints, Réalité (vidéos, photos, messages), histoire de l'humanité, à retenir.
- **Notifications** : cloche globale (NotificationBell).

### 2.3 Professionnel (après validation admin)

- **Types** : clinic, school, scientist, supplier, journalist, ngo, etc.
- **Inscription** : via boutons « S'inscrire » dans chaque page thématique.
- **Après validation** : visibilité dans les listes publiques, réception des rendez-vous et messages.
- **Pages dédiées** : InscriptionPro, MesComptesPro, EspacePro, PrendreRendezVous.

### 2.4 Administrateur

- **Validations** : inscriptions professionnelles.
- **Contenus** : publications Réalité, contenus de foi, livres saints, pauvres, dons.
- **Supervision** : utilisateurs, notifications, rendez-vous, gouvernements, badges, logos.
- **Pages** : AdminDashboard, AdminBadges, AdminGovernments, FamilleAdmin.

---

## 3. Architecture fonctionnelle et modules

Vue d'ensemble des blocs métier et des pages associées.

| Module | Pages principales (frontend) | Routes API principales (backend) |
|--------|-----------------------------|----------------------------------|
| Portail / Compte | Home, Account (UserDashboard), MonProfil, Communaute | auth |
| Authentification | Login, LoginMembre, ForgotPassword, RegistrationChoice | auth |
| Inscription Vivant | LivingChoice, VideoRegistration, WrittenRegistration | auth, userStories |
| Inscription Défunt | DeceasedChoice, DeceasedVideoRegistration, DeceasedWrittenForm | userStories |
| Famille | Famille, Parents, Enfants, Partenaire, MesAmours, Moi/Arbre, Membres, FamilleAdmin, Inspir | familyTree, parentChild, couple, family |
| Thématiques | Sante, Education, Science, Securite, Activite, Activite1/2/3 | education, science, activities, health |
| Solidarité | Solidarite (onglets Dons, Zaka, Livres, Réalité, ONG) | faith, reality, additional |
| Terre ADAM | TerreAdam, LieuResidence1/2/3 (composant Pays) | residences |
| Pro & Rendez-vous | ListeProfessionnels, EspacePro, MesComptesPro, InscriptionPro, PrendreRendezVous | professionals, appointments, notifications |
| Échanges | EchangesProfessionnel, EchangePrimaire, EchangeNourriture, EchangeMedicament, EchangeSecondaire, EchangeTertiaire, EchangePublier | exchange |
| Régions / États | Guinee, BasseGuinee, FoutaDjallon, HauteGuinee, GuineeForestiere, Pays | regions, governments, pageAdmins |
| IA | ProfesseurIA, GuideEntrepreneur | ia |
| Histoire / Pédago | Histoire, HistoireHumanite, ARetenir, Reflechissons, Prehistoire, Antiquite | - |
| Badges / Jeux | AdminBadges, intégration UserDashboard / profil | badges, defiEducatif |
| Admin | AdminDashboard, AdminBadges, AdminGovernments | admin, logos |
| Autres | Probleme, GalerieFamily, InfoWallou | - |

---

## 4. Portail général, authentification et profil

### 4.1 Objectifs

- Point d'entrée clair (Home) : boutons S'inscrire et Se connecter.
- Tableau de bord personnel (UserDashboard) avec onglets et liens vers toutes les sections.
- Connexion et inscription sécurisées, gestion de session (JWT).
- Profil utilisateur complet (identité, avatar, lieux, contacts).

### 4.2 Écrans et routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Accueil : logo, boutons S'inscrire et Se connecter. |
| `/inscription` | Redirection → `/vivant` | Inscription directe vers parcours vivant. |
| `/choix` | RegistrationChoice | Choix : Vivant ou Défunt. |
| `/login` | Login | Connexion (email / mot de passe). |
| `/login-membre` | LoginMembre | Connexion membre famille / communauté. |
| `/mot-de-passe-oublie` | ForgotPassword | Récupération de mot de passe. |
| `/compte` | Account → UserDashboard | Tableau de bord : profil compact, onglets Terre ADAM, Activité, Échanges, Temps, Science, Éducation ; liens Famille, Solidarité, Santé, Sécurité. |
| `/moi` | Redirection → `/compte` | - |
| `/moi/profil` | MonProfil | Édition complète du profil (identité, photo, lieux, contacts). |
| `/communaute` | Communaute | Vue communauté, listes, suggestions d'amis. |
| `/identite` | Identite | Complétion ou mise à jour de l'identité. |
| `/probleme` | Probleme | Page de signalement de problème. |

### 4.3 Exigences

- **Sécurité** : mots de passe hashés, token JWT pour routes protégées, redirection vers login si non connecté.
- **UX** : bouton Retour visible, affichage du nom et de la photo de l'utilisateur, accès aux notifications (NotificationBell).
- **Profil** : carte profil compacte, boutons Mon profil et Admin sous le NumeroH.

---

## 5. Module Famille et liens de sang

### 5.1 Objectifs

- Déclarer et visualiser sa **famille** (parents, enfants, partenaire, amours, membres).
- Construire un **arbre généalogique** (vivants et décédés).
- Gérer des **parcours vivants** (texte, vidéo) et **défunts** (hommages, validation par un membre).

### 5.2 Parcours d'inscription Vivant (`/vivant/*`)

| Route | Page | Description |
|-------|------|-------------|
| `/vivant` | LivingChoice | Choix du mode : vidéo ou formulaire écrit. |
| `/vivant/video` | VideoRegistration | Enregistrement vidéo d'un proche vivant. |
| `/vivant/formulaire` | WrittenRegistration | Formulaire écrit complet. |

**WrittenRegistration – champs principaux :**
- **Bloc Pays** (repliable) : Pays, Région, Préfecture, Sous-préfecture, Quartier (worldGeography).
- Fermeture automatique du bloc Pays une fois tous les champs remplis.
- **Activité** : champ Preuve (photo, PDF, document) avec boutons « Prendre » et « Choisir ».
- Région : saisie texte libre (datalist). Ethnie et Famille : saisie libre si valeur hors liste.
- Continent dérivé automatiquement du pays (pour NumeroH).

### 5.3 Parcours Défunt (`/defunt/*`)

| Route | Page | Description |
|-------|------|-------------|
| `/defunt` | DeceasedChoice | Choix écrit ou vidéo. |
| `/defunt/choix` | DeceasedChoice | Idem. |
| `/defunt/video` | DeceasedVideoRegistration | Enregistrement vidéo hommage. |
| `/defunt/formulaire` | DeceasedWrittenForm | Formulaire écrit hommage. |

### 5.4 Pages Famille

| Route | Page | Description |
|-------|------|-------------|
| `/famille` | Famille | Hub : cartes Mes Parents, Mon Homme, Ma Femme, Mes Enfants, Moi (→ Mon arbre), Mes Amours ; lien Vue Admin si admin. |
| `/famille/moi` | Moi | Section Moi, contenu : Mon arbre. |
| `/famille/moi/arbre` | Arbre | Arbre généalogique (ArbreGenealogique), onglet Échanges familiaux, Cercle des Racines. |
| `/famille/moi/arbre/membres` | Membres | Liste des membres de l'arbre. |
| `/famille/parents` | Parents | Fiches parents, ajout/édition, demandes de lien. |
| `/famille/enfants` | Enfants | Fiches enfants. |
| `/famille/femmes`, `/famille/mari` | Partenaire | Fiche partenaire. |
| `/famille/mes-amours` | MesAmours | Gestion des amours (FloatingMessenger). |
| `/famille/admin` | FamilleAdmin | Outils admin famille. |
| `/famille/inspir` | Inspir | Inspirations, exemples. |
| `/galerie-famille` | GalerieFamily | Galerie photos famille. |

### 5.5 Backend – modèles et routes

- **Modèles** : User, ParentChildLink, CoupleLink, ParentChildActivity, CoupleActivity, FamilyTreeMessage, PublishedStory, DeceasedMember.
- **Routes** : familyTree.js, parentChild.js, couple.js, family.js, userStories.js.

### 5.6 Règles métier

- Lien parent–enfant : validation par au moins un des deux comptes ; pas de cycles.
- Couple : statuts (en couple, marié, séparé, veuf, etc.).
- Défunt : au moins un membre de la famille doit valider la fiche hommage.

---

## 6. Module Amis et communauté

### 6.1 Objectifs

- Réseau social : demandes d'amitié, accepter/refuser/bloquer.
- Communiquer au-delà de la famille.

### 6.2 Backend

- **Modèles** : Friend, FriendRequest, Friendship.
- **Routes** : friends.js.

### 6.3 Frontend

- Intégration dans UserDashboard, Moi, MonProfil, Communaute.
- Affichage : liste d'amis, demandes en attente, actions (profil, message).

---

## 7. Pages thématiques (Santé, Éducation, Science, Sécurité, Activités)

### 7.1 Fonctions communes

- En-tête avec **Retour** et **S'inscrire** (pro) selon la page.
- Contenu spécifique au thème (textes, cartes, listes).
- Lien vers rendez-vous / messages avec les professionnels.

### 7.2 Gestion des professionnels (ProSection)

- **Composant** : ProSection (titre, icône, description, formulaire d'inscription, liste des pros approuvés).
- **API** : `/api/professionals/approved?type=...`
- Filtrage par nom / ville.
- Bouton **Prendre rendez-vous** → flux PrendreRendezVous.
- Bouton **+ S'inscrire** : ouvre le formulaire et scroll jusqu'à la section.

### 7.3 Pages concernées

- **Sante** (`/sante`) : santé communautaire, professionnels santé, hôpitaux, produits santé.
- **Education** (`/education`) : formations, défis éducatifs, cours (audio, vidéo, écrit, exercice, bibliothèque), professeurs, écoles, inscriptions, suivi des enfants.
- **Science** (`/science`) : contenus scientifiques validés.
- **Securite** (`/securite`) : agents de sécurité, messages.
- **Activite** (`/activite`) : activités sociales, groupes (Activité1, Activité2, Activité3), messagerie par activité.

### 7.4 Pages complémentaires

- **Activite1, Activite2, Activite3** : segmentation par activité professionnelle.
- **Hommes, Femmes** : segmentation par genre (intégrées dans les pages thématiques).
- **TrouverProfesseur, MesCours, InscriptionFormation** : pages Éducation avancée (composants ou sous-pages).

---

## 8. Module Solidarité (Dons, Zaka, Livres de Dieu, Réalité, ONG)

### 8.1 Objectifs

- **Dons** : liste des pauvres, détail (situation, besoins, urgence), formulaire de don, historique « Mes dons ».
- **Zaka** : règles spécifiques musulmans.
- **Livres de Dieu** : liste des livres saints (titre, auteur, extraits, réflexions).
- **Réalité** : publications admin (vidéos, photos, messages) ; utilisateurs en lecture seule (ou publication selon droits).
- **ONG** : onglet dans Solidarité, liste des ONG (ProSection type ngo), inscription ONG, prise de rendez-vous / messages.

### 8.2 Sous-onglets Solidarité (`/solidarite`)

- **Dons** (sous-onglets : Pauvres, Mes dons).
- **Zaka**
- **Les Livres de Dieu Unique**
- **Réalité**
- **ONG**

### 8.3 Redirections

- `/dons`, `/donations`, `/zaka`, `/zaka-et-dons` → redirection vers `/` (à adapter vers `/solidarite` si souhaité).

### 8.4 Backend

- **Routes** : faith.js, reality.js, additional.js (pauvres, dons, livres saints, zakat).
- **Modèles** : PoorPerson, HolyBook, FaithContent, RealityPost, etc.

---

## 9. Terre ADAM, lieux de résidence et quartiers

### 9.1 Objectifs

- Représenter les **lieux de résidence** : quartier, sous-préfecture, préfecture.
- Chaque utilisateur peut avoir **1 à 3 quartiers** (résidence 1, 2, 3).
- Messagerie par groupe (quartier, sous-préfecture, préfecture), besoins du quartier (décès, mariage, baptême, etc.).

### 9.2 Page Terre Adam (`/terre-adam`)

- **Onglets** : Lieux (sous-onglets Quartier 1/2/3, Sous-préfecture, Préfecture), Région, Pays, Continent, Mondial, Journalistes.
- **Section Quartier** : 3 emplacements fixes (Résidence 1, 2, 3). Si vide : bouton « Ajouter un quartier » → Mon profil.
- **Messagerie** : groupes par quartier(s), filtres (mes quartiers / tous), catégories besoins.
- **Composants** : CommunicationHub, publications, filtres.
- **Journalistes** : publication au-delà du quartier (sous-préfecture, préfecture, région, pays, continent).

### 9.3 Backend

- **Routes** : residences.js.
- **Modèles** : ResidenceGroup, ResidenceMessage.
- Données géographiques : worldGeography (continent → pays → région → préfecture → sous-préfecture → quartier).

### 9.4 Pages lieux

- LieuResidence1, LieuResidence2, LieuResidence3 (détail par résidence).
- Redirections : `/lieux-residence`, `/pays` → `/terre-adam`.
- **Composant Pays** : intégré dans TerreAdam ou pages régionales (Mon Pays & Régions, Guinée, Afrique, Monde, Culture).

---

## 10. Espace professionnel, rendez-vous et notifications

### 10.1 Objectifs

- Lister les professionnels par type, afficher une fiche détaillée.
- **Prise de rendez-vous** : professionnel, date/heure, type (présentiel, téléphone, en ligne), motif, détails.
- **Cycle de vie** : pending → accepted / refused / rescheduled ; notifications à chaque changement.
- **Notifications** : cloche globale (NotificationBell), liste et marquage lu.

### 10.2 Pages et routes

| Route | Page |
|-------|------|
| `/inscription-pro` | InscriptionPro |
| `/professionnels` | ListeProfessionnels |
| `/mes-comptes-pro` | MesComptesPro |
| `/espace-pro/:id` | EspacePro |
| `/rendez-vous/:id` | PrendreRendezVous |

### 10.3 Backend

- **Routes** : professionals.js, appointments.js, notifications.js.
- **Modèles** : ProfessionalAccount, Appointment, Notification.

---

## 11. Régions, pays, gouvernements et organisations

### 11.1 Objectifs

- Représenter la **Guinée** (4 régions naturelles) et les **pays**.
- **Gouvernements** : gestion des régions, dirigeants, messages d'État, produits d'État.
- **Organisations** : groupes, ONG, structures ; admins de page.

### 11.2 Pages régionales (Guinée)

- **Guinee** : page générale Guinée (groupes, événements, annonces).
- **BasseGuinee** : Basse Guinée.
- **FoutaDjallon** : Fouta Djallon.
- **HauteGuinee** : Haute Guinée.
- **GuineeForestiere** : Guinée forestière.

*Note : Ces pages existent et utilisent les API regions (ex. `/api/regions/guinee/groups`, `/api/regions/basse-guinee/events`, etc.). Elles peuvent être intégrées via le composant Pays ou des liens depuis Terre ADAM.*

### 11.3 Backend

- **Routes** : regions.js, governments.js, stateMessages.js, stateProducts.js, organizations.js, pageAdmins.js.
- **Modèles** : RegionGroup, RegionMessage, Government, GovernmentMember, OrganizationGroup, OrganizationPost, PageAdmin.

---

## 12. Échanges (marchés, produits, fournisseurs)

### 12.1 Objectifs

- Marchés en ligne : produits **primaires, secondaires, tertiaires** ; nourriture, médicaments.
- Gestion des **fournisseurs** (ProfessionalAccount type supplier), comparaison de prix.
- **Publication d'annonces** : 3 modes unifiés sur toutes les pages Échange.

### 12.2 Modes de publication (PublierAnnonceButtons)

Composant partagé **PublierAnnonceButtons** utilisé sur toutes les pages Échange. Trois modes identiques partout :

| Mode | Titre | Sous-titre | Contenu formulaire |
|------|-------|------------|-------------------|
| **1. Par écrit** | Par écrit | Champs + photo | Champs texte (titre, catégorie, prix, localisation, etc.) + photos |
| **2. Photo + Audio** | Photo + Audio | Photo + message vocal (max 1 min) | Photo (Prendre ou Choisir) + message vocal (max 60 s) ; aucun champ texte obligatoire |
| **3. Par vidéo** | Par vidéo | Vidéo (max 1 min) | Vidéo (Prendre ou Choisir) ; max 60 s ; aucun champ texte obligatoire |

**Règles :**
- Audio et vidéo : durée max **1 minute** (60 secondes) partout.
- Modes Photo+Audio et Vidéo : pas de champs à remplir (sauf média).
- Système « Prendre » ou « Choisir » pour photo, audio et vidéo.

### 12.3 Pages Échange

| Route | Page | Description |
|-------|------|-------------|
| `/echange` | EchangesProfessionnel | Hub : aperçu produits Primaire, Secondaire, Tertiaire ; 3 boutons Publier ; liens vers sous-pages. |
| `/echange/primaire` | EchangePrimaire | Produits primaires (aliments, matières premières, textile). |
| `/echange/nourriture` | EchangeNourriture | Produits alimentaires (aliments-base). |
| `/echange/medicament` | EchangeMedicament | Produits médicaux (génériques, spécialisés, équipements). |
| `/echange/secondaire` | EchangeSecondaire | Produits secondaires (électronique, machinerie, équipements). |
| `/echange/tertiaire` | EchangeTertiaire | Produits tertiaires (maisons à louer, matériaux de construction). |
| `/echange/publier` | EchangePublier | Publication centralisée (paramètre `?mode=ecrit|photo_audio|video`). |

### 12.4 Backend

- **Routes** : exchange.js (primaire, secondaire, tertiaire, nourriture, médicaments).
- **Modèles** : ExchangeProduct, Supplier, Order, PlatformCommission.
- Support : images, vidéos, audio (champ `audio` JSONB sur exchange_products).

---

## 13. IA (Professeur IA, connaissances, conversations)

### 13.1 Objectifs

- **Professeur IA** : aide à l'éducation, réponses personnalisées (culture, histoire, foi).
- **Bases de connaissances** : thèmes, questions/réponses, sources (IaKnowledge).
- **Historique** des conversations (IaConversation) pour continuité et personnalisation.

### 13.2 Backend

- **Routes** : ia.js, ia_new.js.
- **Modèles** : IaKnowledge, IaConversation.
- **Service externe** : IA SC (Python/Flask), démarrage automatique depuis le backend (port 5000).

### 13.3 Frontend

- **Pages** : ProfesseurIA (chat), GuideEntrepreneur (guide + IA).
- **Routes** : `/ia-sc`, `/professeur-ia` → ProfesseurIA.

---

## 14. Histoire, éducation avancée, badges et gamification

### 14.1 Histoire de l'humanité

- **Pages** : Histoire (96 générations depuis Adam), HistoireHumanite, Prehistoire, Antiquite, ARetenir, Reflechissons.
- Contenus pédagogiques (préhistoire, antiquité, timeline), sections « À retenir », « Réfléchissons » (quiz, questions ouvertes).

### 14.2 Badges et jeux

- **Objectifs** : motiver par badges et défis (quiz, jeux), récompenser participation et apprentissage.
- **Backend** : badges.js, defiEducatif.js ; Badge, UserBadge ; initGameModels, Game, GamePlayer, GameQuestion, GameAnswer, GameDeposit, GameTransaction.
- **Frontend** : AdminBadges (gestion des badges/logos), affichage des badges sur le profil et dans le dashboard.

---

## 15. Administration globale

### 15.1 Objectifs

- Vue centrale : statistiques (utilisateurs, professionnels, ONG, pauvres), alertes (contenus à valider, abus).
- Gestion : gouvernements, logos, badges, contenus, validations pro, modération.

### 15.2 Pages

- AdminDashboard, AdminBadges (et onglet logos), AdminGovernments.
- FamilleAdmin, Inspir (famille).

### 15.3 Backend

- **Routes** : admin.js, logos.js, pageAdmins.js.
- **Modèles** : Logo, UserLogo, PageAdmin, etc.

### 15.4 Exigences

- Accès réservé aux admins (contrôle rôle/Token).
- Traces d'audit souhaitables pour actions sensibles.

---

## 16. Exigences techniques (stack, API, sécurité)

### 16.1 Frontend

| Élément | Choix |
|---------|--------|
| Framework | React 18 + TypeScript |
| Build | Vite |
| Routing | react-router-dom |
| Style | TailwindCSS (classes utilitaires) |
| i18n | Fichiers de traduction (fr, en, ar, man, pul) |
| Organisation | pages/*, components/*, utils/*, i18n/*, config/* |

**Composants clés** : Banner, ThemeToggle, FloatingMessenger, ProSection, NotificationBell, ArbreGenealogique, EditProfileModal, IdentiteModal, LieuxResidence, CommunicationHub, PublierAnnonceButtons, AudioRecorder, VideoRecorder, Pays, EchangesProfessionnel, DefiEducatifContent.

### 16.2 Backend

| Élément | Choix |
|---------|--------|
| Runtime | Node.js |
| Framework | Express |
| Base de données | **PostgreSQL** (Sequelize, dialect postgres) |
| Auth | JWT (token), mots de passe hashés (bcrypt) |
| Fichiers | Multer (upload), tailles/types limités |

**Routes principales** : auth, admin, badges, logos, pageAdmins, governments, activities, residences, education, regions, organizations, faith, friends, additional, exchange, documents, defiEducatif, family, familyTree, parentChild, couple, science, reality, stateMessages, stateProducts, userStories, professionals, appointments, notifications, ia, health.

### 16.3 Scripts et IA

- **Démarrage** : backend (port 5002), frontend (Vite), IA SC (Python, port 5000).
- **Dossiers IA** : `IA SC/` (app.py).

### 16.4 Sécurité

- Routes protégées : vérification JWT.
- Données sensibles visibles uniquement pour utilisateurs connectés ou autorisés.
- Validation côté serveur des entrées, pas d'exposition de secrets (config.env, .env en .gitignore).

---

## 17. Règles transverses (formulaires, UX, accessibilité)

### 17.1 Formulaires

- **Validation** : champs obligatoires marqués, messages d'erreur lisibles.
- **Bouton de soumission** : désactivé tant que des champs obligatoires sont invalides.
- **Types** : texte court/long, numérique, contact (email, téléphone), sélection, fichiers (image, vidéo, PDF).
- **Contraintes** : longueurs max, tailles max fichiers, barre de progression et messages en cas d'échec d'upload.

### 17.2 Utilisateur – inscription et profil

- **Inscription vivant** : WrittenRegistration (bloc Pays, préfecture, preuve activité, etc.) ou VideoRegistration.
- **Profil** : identité (date de naissance, sexe, pays, ville, langues), contact, photo, préférences (notifications).

### 17.3 Professionnels et ONG (ProSection)

- Types : clinique, école, scientifique, fournisseur, journaliste, ONG, etc.
- Champs communs : nom (obligatoire), description, adresse, ville, pays, téléphone, email, services, spécialités.
- Statut : pending → validation admin → approved.

### 17.4 Famille – fiches vivants / décédés

- **Vivant** : lien (parent, enfant, partenaire), identité, statut vivant, lien confirmé ; enregistrement écrit et/ou vidéo.
- **Défunt** : identité, type d'hommage (écrit/vidéo), validateur famille, fiche écrite/vidéo ; au moins un membre valide.

### 17.5 Pauvres, dons, Zaka

- **Fiche pauvre** : identité, localisation, situation, besoins, taille de famille, urgence, contact restreint.
- **Don** : type (argent, nourriture, vêtements, médicaments, autre), montant+devise, bénéficiaire, description, statut, historisation.

### 17.6 Contenus « Réalité »

- Admin : titre, contenu texte, catégorie (vidéo, photo, message), type, média, auteur, date.
- Utilisateurs : filtre par catégorie, détail (texte + média).

### 17.7 Accessibilité et UX

- Police lisible, contrastes suffisants, boutons accessibles (taille minimale, zones cliquables) sur mobile.
- Boutons Retour et « S'inscrire » cohérents selon les pages.
- Thème clair/sombre (ThemeToggle).
- Textes isolés pour i18n (fichiers de traduction).

### 17.8 Journalisation

- Log des erreurs backend.
- Traces pour actions sensibles (admin, validation liens familiaux, dons, rendez-vous).

---

## Annexe A – Liste des routes frontend (référence)

```
/                           Home
/choix                      RegistrationChoice (Vivant / Défunt)
/vivant                     LivingChoice
/vivant/video               VideoRegistration
/vivant/formulaire          WrittenRegistration
/defunt                     DeceasedChoice
/defunt/choix               DeceasedChoice
/defunt/video               DeceasedVideoRegistration
/defunt/formulaire          DeceasedWrittenForm
/login                      Login
/login-membre               LoginMembre
/mot-de-passe-oublie        ForgotPassword
/inscription                → /vivant
/compte                     Account (UserDashboard)
/moi                        → /compte
/moi/profil                 MonProfil
/moi/arbre                  → /famille/moi/arbre
/moi/arbre/membres          → /famille/moi/arbre/membres
/identite                   Identite
/communaute                 Communaute
/probleme                   Probleme
/sante                      Sante
/securite                   Securite
/activite                   Activite
/education                  Education
/solidarite                 Solidarite
/dons, /donations           → /
/zaka, /zaka-et-dons        → /
/admin                      AdminDashboard
/admin/badges               AdminBadges
/admin/logos                → /admin/badges?tab=logos
/admin/governments          → /admin
/famille                    Famille
/famille/parents            Parents
/famille/femmes, /famille/mari  Partenaire
/famille/enfants            Enfants
/famille/moi                Moi (arbre, membres)
/famille/moi/arbre          Arbre
/famille/moi/arbre/membres  Membres
/famille/mes-amours         MesAmours
/famille/admin              FamilleAdmin
/famille/inspir             Inspir
/galerie-famille            GalerieFamily
/lieux-residence, /pays     → /terre-adam
/terre-adam                 TerreAdam
/organisation               → /activite
/mes-amours                 → /famille/mes-amours
/histoire                   Histoire
/a-retenir                  ARetenir
/histoire-humanite          HistoireHumanite
/science                    Science
/echange                    EchangesProfessionnel
/echange/primaire           EchangePrimaire
/echange/nourriture         EchangeNourriture
/echange/medicament         EchangeMedicament
/echange/secondaire         EchangeSecondaire
/echange/tertiaire          EchangeTertiaire
/echange/publier            EchangePublier
/ia-sc, /professeur-ia      ProfesseurIA
/inscription-pro            InscriptionPro
/professionnels             ListeProfessionnels
/mes-comptes-pro            MesComptesPro
/espace-pro/:id             EspacePro
/rendez-vous/:id            PrendreRendezVous
/info-wallou                InfoWallou
/dokal, /foi                → /
```

## Annexe B – Modèles backend principaux (référence)

```
User, ProfessionalAccount, Appointment, Notification
ParentChildLink, CoupleLink, ParentChildActivity, CoupleActivity
FamilyTreeMessage, PublishedStory, DeceasedMember, FamilyGallery
Friend, FriendRequest, Friendship
Badge, UserBadge, Logo, UserLogo
Course, Professor, School, ProfessorRequest, FormationRegistration, Formation, Stage
SciencePost, SciencePermission
IaKnowledge, IaConversation
Hospital, HealthProduct, SecurityAgent, ExchangeProduct, Supplier, Order, PlatformCommission
PoorPerson, FaithContent, HolyBook, RealityPost
RegionGroup, RegionMessage, ResidenceGroup, ResidenceMessage
OrganizationGroup, OrganizationPost, Government, GovernmentMember, PageAdmin
Document, ActivityMessage, ActivityGroup, StateMessage
Game, GamePlayer, GameQuestion, GameAnswer, GameDeposit, GameTransaction
+ modèles additionnels (additional.js, etc.)
```

---

*Document aligné sur le contenu actuel du projet « Les Enfants d'Adam » / Terre ADAM. À faire évoluer avec le produit.*
