import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// ─── Base de connaissance complète du site Moftal ─────────────────────────────
const SITE_KNOWLEDGE = [
  // ── PRÉSENTATION GÉNÉRALE ──────────────────────────────────────────────────
  {
    keywords: [
      'but', 'objectif', "c'est quoi", 'qu est ce que', 'qu est-ce que',
      'kesqui', 'quoi moftal', 'a quoi sert', 'à quoi ça sert', 'a quoi ca sert',
      'presentation', 'présentation', 'plateforme', 'application', 'site',
      'explique', 'comment fonctionne', 'keskoze', 'c quoi', 'kc', 'pourquoi',
      'pour quoi', 'role', 'rôle', 'mission'
    ],
    response: `**Moftal — La plateforme des Enfants d'Adam** 🌍\n\nMoftal est un **système d'enregistrement généalogique et communautaire** qui permet à chaque être humain d'exister numériquement et de rester connecté à sa famille, ses proches et sa communauté.\n\n**Ce que vous pouvez faire sur Moftal :**\n\n🌳 **Construire votre arbre généalogique** — Ajoutez parents, enfants, conjoint et visualisez votre lignée familiale\n\n🆔 **Obtenir un Numéro H** — Votre identifiant unique sur la plateforme (pour les vivants) ou **Numéro HD** (pour les défunts)\n\n💬 **Messagerie privée** — Communiquez avec votre conjoint(e) via "Mes Amours"\n\n🏥 **Prendre des rendez-vous** — Avec des médecins, cliniques et professionnels de santé\n\n🎓 **Accéder à l'éducation** — Professeur IA spécialisé Maths & Français (CP → Terminale)\n\n🛒 **Faire des échanges** — Achat/vente de produits entre membres\n\n💼 **Créer un compte professionnel** — Pour médecins, entreprises, écoles, ONG...\n\n💰 **Moftal Pay** — Système de paiement intégré pour les services\n\n👨‍👩‍👧‍👦 **Compte Famille** — Créé automatiquement dès 5 membres dans l'arbre`,
    links: [{ label: 'Créer un compte', path: '/choix' }, { label: 'Se connecter', path: '/login' }, { label: 'Ma Famille', path: '/famille' }]
  },

  // ── NUMÉRO H (VIVANT) ──────────────────────────────────────────────────────
  {
    keywords: [
      'numeroh', 'numero h', 'numéro h', 'mon numero', 'mon numéro',
      'identifiant', 'numero unique', 'numéro unique', 'numero personnel',
      'numero membre', 'qu est ce qu un numeroh', 'c quoi numeroh', 'numero h?',
      'trouver mon numero', 'ou est mon numero', 'numero inscription',
      'numero enregistrement', 'numero vivant', 'mon identifiant'
    ],
    response: `**Le Numéro H — Votre identité numérique unique** 🆔\n\nLe **Numéro H** est l'identifiant unique attribué automatiquement à chaque membre **vivant** lors de son inscription sur Moftal.\n\n**Format réel :** G{n}C{n}P{n}R{n}E{n}F{n} {n}\n**Exemple :** G96C1P1R1E1F2 1\n\n**Chaque lettre a une signification précise :**\n🌿 **G** = Génération (G96 = génération 96 = nés entre 1982 et 2044)\n🌍 **C** = Continent (C1=Afrique, C2=Europe, C3=Asie, C4=Amérique, C5=Océanie)\n🏳️ **P** = Pays (numéro de votre pays d'origine)\n📍 **R** = Région (numéro de votre région)\n👥 **E** = Ethnie (numéro de votre ethnie)\n👨‍👩‍👧 **F** = Famille (numéro de votre lignée familiale)\n🔢 **Le chiffre final** = Numéro unique dans votre lignée\n\n**À quoi sert le Numéro H ?**\n✅ Se connecter à votre compte (votre identifiant de connexion)\n✅ Être retrouvé par vos proches dans l'arbre familial\n✅ Lier des membres de famille entre eux\n✅ Identifier votre place dans l'histoire de l'humanité\n\n**Comment le retrouver ?**\n→ Page Identité → section "Décodage de votre NumeroH"\n\n⚠️ **Conservez votre Numéro H précieusement !** Sans lui, vous ne pouvez pas vous connecter.`,
    links: [{ label: 'Mon Identité', path: '/identite' }, { label: 'Mon Compte', path: '/compte' }]
  },

  // ── DÉCODAGE NUMÉRO H ──────────────────────────────────────────────────────
  {
    keywords: [
      'decoder numeroh', 'décoder numeroh', 'signification numeroh', 'que veut dire',
      'lire numeroh', 'comprendre numeroh', 'g96', 'g1 adam', 'generation g',
      'c1 afrique', 'c2 europe', 'c3 asie', 'lettre numeroh', 'lettre numero h',
      'signification lettre', 'que signifie', 'expliquer numeroh', 'explication numeroh',
      'format numeroh', 'comment lire mon numero', 'decode', 'chiffre apres espace',
      'generation humanite', '63 ans', 'periode generation', 'numeroh format'
    ],
    response: `**Décodage complet du Numéro H** 🔬\n\n**Exemple : G96C1P1R1E1F2 1**\n\n━━━━━━━━━━━━━━━━━━━━━\n🌿 **G = Génération**\n→ G96 = vous appartenez à la **96ème génération** de l'humanité\n→ Chaque génération dure **63 ans**\n→ L'histoire commence avec G1 (Adam, vers -4003 av. J.-C.)\n→ G96 couvre la période **1982 à 2044**\n→ G97 débutera en 2045\n\n🌍 **C = Continent**\n→ C1 = Afrique | C2 = Europe | C3 = Asie\n→ C4 = Amérique | C5 = Océanie | C6 = Antarctique\n\n🏳️ **P = Pays**\n→ Numéro de votre pays d'origine sur Moftal\n→ Ex: P1 = premier pays enregistré dans votre continent\n\n📍 **R = Région**\n→ Numéro de votre région dans votre pays\n\n👥 **E = Ethnie**\n→ Numéro de votre groupe ethnique\n\n👨‍👩‍👧 **F = Famille / Lignée**\n→ Numéro de votre lignée familiale\n\n🔢 **Chiffre après l'espace = Séquence unique**\n→ Votre numéro personnel dans votre lignée\n→ Jamais répété — vous êtes unique !\n\n**Ce NumeroH encode toute votre identité humaine** : votre génération, votre continent, votre pays, votre région, votre ethnie et votre famille.`,
    links: [{ label: 'Mon Identité', path: '/identite' }, { label: 'Histoire de l\'Humanité', path: '/histoire-humanite' }]
  },

  // ── NUMÉRO HD (DÉFUNT) ─────────────────────────────────────────────────────
  {
    keywords: [
      'numerohd', 'numero hd', 'numéro hd', 'hd-', 'defunt numeroh',
      'defunt numero', 'défunt numero', 'mort numeroh', 'compte defunt numero',
      'numero defunt', 'numéro défunt', 'identifiant defunt', 'hd', 'mort numero'
    ],
    response: `**Le Numéro HD — Identifiant des comptes Défunts** 🕊️\n\nLe **Numéro HD** est l'identifiant unique attribué aux **comptes mémoriels** de personnes décédées.\n\n**Format :** HD-XXXXX (ex: HD-00123)\n\n**Différence avec le Numéro H :**\n| Numéro H | Numéro HD |\n|---|---|\n| Pour les vivants | Pour les défunts |\n| Connexion personnelle | Géré par un proche |\n| H-XXXXX | HD-XXXXX |\n\n**À quoi sert le Numéro HD ?**\n✅ Créer un profil mémoriel pour un proche décédé\n✅ Intégrer le défunt dans l'arbre généalogique familial\n✅ Conserver les informations et photos du défunt\n✅ Permettre à toute la famille de se souvenir\n\n**Comment créer un compte Défunt ?**\n→ Cliquez sur "S'inscrire"\n→ Choisissez **"Défunt"**\n→ Renseignez les informations du proche décédé\n→ Un Numéro HD lui est attribué automatiquement`,
    links: [{ label: "Créer un compte Défunt", path: '/choix' }, { label: 'Inscription', path: '/defunt' }]
  },

  // ── CRÉER UN COMPTE ────────────────────────────────────────────────────────
  {
    keywords: [
      'compte', 'inscription', 'enregistrer', 'creer', 'créer', 's inscrire',
      'inscris', 'nouveau', 'rejoindre', 'register', 'sign up', 'inscrire',
      'comment m inscrire', 'comment je cree', 'je veux creer', 'comment ouvrir',
      'ouvrir un compte', 'nouveau compte', 'premiere fois'
    ],
    response: `**Comment créer un compte sur Moftal ?** 📝\n\nVous avez **2 types de comptes** :\n\n👤 **Compte Vivant** — Pour vous-même\n→ Cliquez sur "S'inscrire" puis choisissez **"Vivant"**\n→ Renseignez : prénom, nom, date de naissance, téléphone, mot de passe\n→ Un **Numéro H unique** vous est attribué automatiquement\n→ Conservez votre Numéro H ! Il sert à vous connecter\n\n🕊️ **Compte Défunt** — Pour un proche décédé\n→ Choisissez **"Défunt"** lors de l'inscription\n→ Renseignez les informations du défunt\n→ Un **Numéro HD unique** lui est attribué\n→ Vous gérez ce compte en son honneur\n\n**Étapes rapides :**\n1️⃣ Cliquez sur "Créer un compte"\n2️⃣ Choisissez Vivant ou Défunt\n3️⃣ Remplissez le formulaire\n4️⃣ Notez votre Numéro H ou HD\n5️⃣ Connectez-vous !`,
    links: [{ label: 'Créer un compte', path: '/choix' }, { label: 'Inscription Vivant', path: '/vivant' }, { label: 'Inscription Défunt', path: '/defunt' }]
  },

  // ── CONNEXION ──────────────────────────────────────────────────────────────
  {
    keywords: [
      'connecter', 'connexion', 'login', 'se connecter', 'acceder', 'accéder',
      'entrer', 'ouvrir session', 'je veux me connecter', 'comment je me connecte',
      'comment acceder', 'entrer dans mon compte', 'rejoindre mon compte',
      'premiere connexion', 'première connexion', 'connexion telephone', 'connexion email',
      'me connecte', 'me connecter', 'connecte avec', 'avec mon telephone', 'avec mon téléphone',
      'avec mon email', 'avec mon e-mail', 'numero de telephone', 'numéro de téléphone'
    ],
    response: `**Comment se connecter sur Moftal ?** 🔐\n\n**Étapes :**\n1️⃣ Cliquez sur **"Connexion"**\n2️⃣ Entrez votre **téléphone**, votre **e-mail** ou votre **Numéro H** — les trois marchent\n3️⃣ Entrez votre **mot de passe**\n4️⃣ Cliquez sur **"Se connecter"**\n\n**Première connexion (vous avez été ajouté par un établissement) :**\nUne école, un restaurant, une entreprise… vous a ajouté avec votre téléphone ou votre e-mail ?\n→ Tapez ce téléphone / cet e-mail **sans mot de passe** et validez\n→ Saisissez le **code de première connexion** (6 chiffres) que l'établissement vous a donné, puis **choisissez votre mot de passe**\n→ Ensuite, vous vous connectez toujours avec ce téléphone / cet e-mail\n\n**Lien d'une application reçu ?** Ouvrez-le : après la connexion, vous revenez directement dans l'application, prête à être installée.\n\n**Problèmes fréquents :**\n❌ "Mot de passe incorrect" → lien "Mot de passe oublié"\n❌ "Compte introuvable" → vérifiez le numéro (avec l'indicatif, ex. +224) ou inscrivez-vous`,
    links: [{ label: 'Se connecter', path: '/login' }, { label: 'Mot de passe oublié', path: '/mot-de-passe-oublie' }]
  },

  // ── MOT DE PASSE OUBLIÉ ────────────────────────────────────────────────────
  {
    keywords: [
      'mot de passe', 'mdp', 'oublie', 'oublié', 'password', 'reinitialiser',
      'réinitialiser', 'reset', 'changer mot de passe', 'modifier mot de passe',
      'mot de passe perdu', 'oubli', 'mot passe oublie'
    ],
    response: `**Mot de passe oublié ?** 🔑\n\n**Comment réinitialiser votre mot de passe :**\n\n1️⃣ Allez sur la page de connexion\n2️⃣ Cliquez sur **"Mot de passe oublié"**\n3️⃣ Entrez votre **Numéro H** ou votre **email**\n4️⃣ Suivez les instructions envoyées\n\n**Changer votre mot de passe (si connecté) :**\n→ Mon Compte → Paramètres → Changer le mot de passe\n\n⚠️ Si vous avez perdu votre Numéro H ET votre mot de passe, contactez le support Moftal.`,
    links: [{ label: 'Mot de passe oublié', path: '/mot-de-passe-oublie' }, { label: 'Mon Compte', path: '/compte' }]
  },

  // ── PAGE FAMILLE (HUB) ─────────────────────────────────────────────────────
  {
    keywords: [
      'famille', 'familial', 'page famille', 'espace famille', 'hub famille',
      'menu famille', 'section famille', 'onglet famille'
    ],
    response: `**La Page Famille** 👨‍👩‍👧‍👦\n\nDepuis l'Accueil, en tapant sur "Famille", vous voyez **4 gros boutons** :\n\n🌳 **Héritage** — votre arbre généalogique et tout ce qui concerne votre lignée\n💕 **Amitié** — vos relations et échanges avec vos proches\n📜 **Récit** — l'histoire et les témoignages de votre famille\n🤝 **Solidarité** — entraide entre membres de la famille\n\n**Aucune section ne s'ouvre automatiquement** : vous appuyez sur celle que vous voulez.`,
    links: [{ label: 'Ma Famille', path: '/famille' }]
  },

  // ── HÉRITAGE (ARBRE + MESSAGES + FOYER + GALERIE + MAIRIE) ──────────────────
  {
    keywords: [
      'heritage', 'héritage', 'page heritage', 'page héritage', 'arbre', 'genealogique',
      'généalogique', 'arbre familial', 'ascendance', 'descendance', 'lignee', 'lignée',
      'ancetres', 'ancêtres', 'generations', 'générations', 'arbre genea', 'genealogie',
      'généalogie', 'construire arbre', 'creer arbre', 'voir arbre', 'afficher arbre',
      'visualiser famille', 'foyer', 'mairie', 'galerie famille', 'messages famille'
    ],
    response: `**Héritage** 🌳\n\nEn ouvrant "Héritage" depuis la page Famille, vous arrivez directement sur **Messages**, et 6 boutons sont disponibles sur une seule ligne :\n\n💬 **Messages** — messagerie familiale (ouvert par défaut)\n🏠 **Foyer** — informations sur votre foyer\n🚨 **Problèmes** — signaler un problème\n📷 **Galerie** — photos partagées de la famille\n🌳 **Arbre** — votre arbre généalogique (numéro de sang, chefs de lignée, membres)\n🏛️ **Mairie** — professionnels de mairie près de chez vous\n\n**Activation de l'arbre :**\n💰 100 000 GNF pour 5 ans (options : 5/10/15/20 ans)\n\n**Compte Famille automatique** dès 5 membres dans l'arbre, avec un **Numéro Sang** unique (ex : F2S1).`,
    links: [{ label: 'Ma Famille', path: '/famille' }]
  },

  // ── COMPTE FAMILLE & NUMÉRO SANG ──────────────────────────────────────────
  {
    keywords: [
      'compte famille', 'numéro sang', 'numero sang', 'sanguin', 'familycode',
      'family code', 'f2s1', 'code famille', 'famille 5 membres', 'compte familial',
      'creation compte famille', 'quand compte famille', 'comment compte famille',
      'seuil membres', '5 membres', 'cinq membres'
    ],
    response: `**Le Compte Famille & Numéro Sang** 🏠\n\n**Compte Famille :**\n→ Créé **automatiquement** dès que votre arbre atteint **5 membres**\n→ Aucune action manuelle nécessaire — c'est automatique !\n\n**Le Numéro Sang :**\n→ Identifiant unique de votre lignée familiale\n→ Format : ex. **F2S1** (Family + Numéro lignée)\n→ Jamais répété, unique à votre famille\n→ Visible dans votre Arbre et votre Compte Famille\n→ Disponible après activation de l'arbre\n\n**Activation de l'arbre :**\n💰 **100 000 GNF = 5 ans** d'accès complet\n→ Options : 5 / 10 / 15 / 20 ans\n→ Abonnement renouvelable (pas à vie)\n\n**Contenu du Compte Famille :**\n✅ Tableau de bord familial\n✅ Gestion des fonds familiaux\n✅ Gérants familiaux (gérant 1 & gérant 2)\n✅ Conseiller familial\n✅ Statistiques de la famille`,
    links: [{ label: 'Ma Famille', path: '/famille' }, { label: 'Mon Arbre', path: '/famille/moi/arbre' }]
  },

  // ── MES AMOURS (MESSAGERIE COUPLE) ────────────────────────────────────────
  {
    keywords: [
      'amours', 'mes amours', 'messagerie couple', 'message conjoint',
      'parler conjoint', 'chat couple', 'messagerie partenaire', 'message mari',
      'message femme', 'private message', 'couple message', 'discuter conjoint',
      'envoyer message', 'tchat prive', 'tchat privé'
    ],
    response: `**Mes Amours — Messagerie Privée Couple** ❤️\n\n"Mes Amours" est la **messagerie privée** entre vous et votre conjoint(e) sur Moftal.\n\n**Fonctionnalités :**\n💬 Échange de messages privés\n🖼️ Partage de photos et stories\n🔒 Conversation privée (accessible uniquement au couple)\n\n**Comment y accéder :**\n→ Depuis l'Accueil → Famille → **Amitié**\n\n**Prérequis :**\n→ Avoir un(e) partenaire lié(e) dans votre arbre familial\n→ Le/la partenaire doit avoir un compte Moftal actif`,
    links: [{ label: 'Mes Amours', path: '/famille/mes-amours' }, { label: 'Ma Famille', path: '/famille' }]
  },

  // ── ACTIVATION ARBRE / PAIEMENT ────────────────────────────────────────────
  {
    keywords: [
      'activation', 'activer arbre', 'activer compte', 'payer arbre',
      '100000', '100 000', 'gnf', 'prix arbre', 'tarif arbre', 'cout arbre',
      'combien arbre', 'abonnement arbre', '5 ans', 'duree abonnement',
      'durée abonnement', 'renouveler', 'expiration', 'moftal pay', 'paiement',
      'payer', 'tarif', 'prix', 'cout', 'coût', 'combien', 'frais'
    ],
    response: `**Moftal Pay — Système de Paiement** 💰\n\n**Activation de l'Arbre Généalogique :**\n💰 **100 000 GNF = 5 ans** d'accès complet\n\nOptions de durée disponibles :\n| Durée | Prix |\n|-------|------|\n| 5 ans | 100 000 GNF |\n| 10 ans | 200 000 GNF |\n| 15 ans | 300 000 GNF |\n| 20 ans | 400 000 GNF |\n\n⚠️ L'abonnement est **renouvelable** (PAS à vie)\n\n**Autres tarifs :**\n🏥 **Comptes Professionnels** (prix par mois, Afrique) :\n→ Visibilité + Rendez-vous : 10 000 GNF (petits secteurs) · 20 000 GNF (écoles, cliniques, fournisseurs, entreprises)\n→ Visibilité + Gestion Interne : 15 000 GNF · 30 000 GNF\n→ 3 mois d'essai gratuit après approbation · hors Afrique : prix doublés\n❤️ **ONG/Associations** : 10 000 GNF/an (tarif humanitaire spécial)\n🎓 **Professeur IA** : 5 000 GNF/mois ou 50 000 GNF/an\n\n**Wallet Pro :**\n→ Disponible pour les comptes Santé (clinic) et Alimentation (supplier)\n→ Les autres types : "Bientôt disponible"\n\n🔒 Les paiements réels sont gérés par Djomy (Orange Money, MTN MoMo, carte)`,
    links: [{ label: 'Mon Compte', path: '/compte' }, { label: 'Inscription Pro', path: '/inscription-pro' }]
  },

  // ── SANTÉ / RENDEZ-VOUS ────────────────────────────────────────────────────
  {
    keywords: [
      'sante', 'santé', 'médecin', 'medecin', 'rendez-vous', 'rendezvous', 'rdv',
      'docteur', 'clinique', 'hopital', 'hôpital', 'prendre rdv', 'prendre rendez',
      'consultation', 'voir medecin', 'contacter medecin', 'appointment', 'medecins'
    ],
    response: `**La Page Santé** 🏥\n\nTrouvez des professionnels de santé et prenez rendez-vous en ligne :\n\n**Comment prendre un rendez-vous :**\n1️⃣ Allez sur la page **Santé**\n2️⃣ Consultez la liste des médecins et cliniques disponibles\n3️⃣ Cliquez sur le professionnel souhaité\n4️⃣ Choisissez le **type de rendez-vous** :\n   📝 **Écrit** — Décrivez votre problème par écrit + choisissez date/heure/service\n   🎥 **Vidéo** — Enregistrez une courte vidéo (30 secondes)\n5️⃣ Soumettez votre demande\n\n**Suivi de vos rendez-vous :**\n⏳ **En attente** — Le professionnel examine votre demande\n✅ **Accepté** — Votre RDV est confirmé\n❌ **Refusé** — Avec une raison optionnelle\n\n🔔 Vous recevez une **notification** quand votre RDV est accepté ou refusé`,
    links: [{ label: 'Page Santé', path: '/sante' }, { label: 'Trouver un professionnel', path: '/professionnels' }]
  },

  // ── ENREGISTREMENT VIDÉO (STORIES) ────────────────────────────────────────
  {
    keywords: [
      'video', 'vidéo', 'enregistrement video', 'enregistrer video', 'story video',
      'inscription video', 'rdv video', 'consultation video', 'video rdv',
      'enregistrer', 'webcam', 'camera', 'caméra', '30 secondes', 'video consultation'
    ],
    response: `**L'Enregistrement Vidéo** 🎥\n\nSur Moftal, les vidéos servent à :\n\n📹 **Rendez-vous Vidéo** — Enregistrez une vidéo de 30 secondes pour présenter votre problème à un médecin\n📝 **Histoire Personnelle** — Enregistrez votre témoignage vidéo pour l'arbre généalogique\n\n**Comment enregistrer une vidéo pour un RDV :**\n1️⃣ Choisissez le type "Vidéo" lors de la prise de RDV\n2️⃣ Autorisez l'accès à votre caméra\n3️⃣ Enregistrez votre message (max **30 secondes**)\n4️⃣ Visionnez et validez\n5️⃣ Envoyez votre demande\n\n**Limites :**\n📦 Taille maximale : **200 MB** par vidéo\n⏱️ Durée maximale : **30 secondes** pour les RDV\n\n💡 Si votre caméra ne fonctionne pas, choisissez le type "Écrit" à la place.`,
    links: [{ label: 'Page Santé', path: '/sante' }, { label: 'Trouver un professionnel', path: '/professionnels' }]
  },

  // ── COMPTES PROFESSIONNELS ─────────────────────────────────────────────────
  {
    keywords: [
      'professionnel', 'compte pro', 'inscription pro',
      'creer compte pro', 'créer compte pro', 'devenir professionnel', 'gerer mon compte pro', 'compte enterprise',
      'compte clinique', 'professionnel inscription'
    ],
    response: `**Les Comptes Professionnels** 💼\n\nEnregistrez votre activité professionnelle sur Moftal :\n\n**Types de comptes disponibles :**\n🏥 **Santé** — Médecins, cliniques, hôpitaux\n🏢 **Activité** — Entreprises, écoles, établissements\n🔬 **Science** — Chercheurs, laboratoires, scientifiques\n❤️ **Solidarité** — ONG, associations humanitaires\n🛡️ **Sécurité** — Agences de sécurité, protection\n🛒 **Échanges** — Fournisseurs, journalistes\n🕌 **Mosquée/Madrasa** — Établissements religieux\n🏪 **Commerce** — Boutiques, vendeurs, producteurs\n🍽️ **Restaurant** — Établissements de restauration\n🚌 **Transport** — Compagnies de transport\n💄 **Beauté** — Salons de beauté, coiffeurs\n🛠️ **Artisan** — Artisans et métiers manuels\n🏛️ **Mairie** — Collectivités locales\n\n**Étapes d'inscription pro :**\n1️⃣ Cliquez sur "Inscription Professionnelle"\n2️⃣ Choisissez votre type\n3️⃣ Renseignez les informations de votre organisation\n4️⃣ Soumettez pour validation`,
    links: [{ label: 'Inscription Professionnelle', path: '/inscription-pro' }, { label: 'Mes Comptes Pro', path: '/mes-comptes-pro' }, { label: 'Liste Professionnels', path: '/professionnels' }]
  },

  // ── ESPACE PRO ────────────────────────────────────────────────────────────
  {
    keywords: [
      'espace pro', 'mon espace pro', 'bouton espace pro', 'espace professionnel', 'c est quoi espace pro', 'tableau de bord', 'dashboard', 'mes demandes', 'gerer rdv', 'gérer rdv',
      'accepter rdv', 'refuser rdv', 'historique rdv', 'voir mes rendez-vous', 'mes patients',
      'notifications pro', 'profil public', 'publication', 'publier', 'nouvelle publication', 'connecter un client'
    ],
    response: `**L'Espace Pro** 💼\n\nDans votre gestion, le bouton **« Espace Pro »** (en haut à droite) réunit tout ce qui concerne votre visibilité :\n\n🌐 **Voir le site client** — votre site public\n📩 **Messages du site** — ce que les visiteurs vous écrivent (le nombre de nouveaux est affiché)\n📍 **Coordonnées du site** — présentation, téléphone, e-mail, adresse, horaires → « Publier sur le site »\n🖼️ **Photos du site** — photo de couverture et galerie\n📅 **Demandes de rendez-vous** — accepter, accepter avec vidéo, refuser\n📢 **Nouvelle publication** — annonces, produits, promotions, événements (avec image)\n✏️ **Modifier le profil public** — nom, logo, description\n🤝 **Connecter un client**\n\n**Formule Visibilité + Rendez-vous :** onglets Demandes · Historique · Paramètres.\n**Formule Gestion Interne :** tout cela + votre application de gestion complète.`,
    links: [{ label: 'Mes Comptes Pro', path: '/mes-comptes-pro' }, { label: 'Inscription Pro', path: '/inscription-pro' }]
  },

  // ── ÉDUCATION / PROFESSEUR IA ──────────────────────────────────────────────
  {
    keywords: [
      'education', 'éducation', 'ecole', 'école', 'apprendre', 'cours',
      'professeur', 'ia scolaire', 'maths', 'math', 'mathematique', 'mathématique',
      'francais', 'français', 'etude', 'étude', 'professeur ia', 'ia education',
      'exercice', 'scolaire', 'cp', 'ce1', 'ce2', 'cm1', 'cm2', 'college',
      'lycee', 'lycée', 'terminale', 'brevet', 'bac', 'cours en ligne'
    ],
    response: `**La Page Éducation & Professeur IA** 🎓\n\n**Professeur IA — Spécialisé :**\n📚 **Français** : Vocabulaire, Grammaire, Conjugaison, Homophones\n🔢 **Mathématiques** : Arithmétique, Algèbre, Géométrie, Probabilités\n\n**Niveaux couverts :** CP → Terminale\n\n**Ce que le Professeur IA peut faire :**\n✅ Répondre à vos questions de cours\n✅ Générer des exercices interactifs avec correction automatique\n✅ Résoudre des équations (1er et 2ème degré)\n✅ Expliquer des notions (trigonométrie, fractions, conjugaison...)\n✅ Corriger vos réponses et expliquer les erreurs\n\n**Accès :**\n→ Menu → Éducation → Professeur IA\n\n**Tarif :**\n💰 5 000 GNF/mois ou 50 000 GNF/an\n\n**Onglets disponibles :**\n🏋️ Entraînement — Exercices interactifs\n💬 Questions — Chat libre\n🕐 Historique — Vos conversations`,
    links: [{ label: 'Page Éducation', path: '/education' }, { label: 'Professeur IA', path: '/professeur-ia' }]
  },

  // ── ÉCHANGES / COMMERCE ────────────────────────────────────────────────────
  {
    keywords: [
      'echange', 'échange', 'commerce', 'vente', 'achat', 'produit', 'nourriture',
      'aliment', 'medicament', 'médicament', 'annonce', 'publier', 'acheter',
      'vendre', 'marche', 'marché', 'boutique', 'article', 'offre', 'demande',
      'primaire', 'secondaire', 'tertiaire', 'alimentation', 'pharmacie'
    ],
    response: `**La Page Échanges** 🛒\n\nPlateforme de commerce et d'échanges entre membres :\n\n**Catégories disponibles :**\n💊 **Médicaments** — Produits pharmaceutiques, santé\n🌱 **Primaire** — Matières premières, agriculture, élevage\n🔧 **Secondaire** — Industrie, transformation, artisanat\n💼 **Tertiaire** — Services professionnels, conseil\n📱 **Quaternaire** — Technologie, véhicules\n\n**Comment publier une annonce :**\n1️⃣ Allez sur la page Échanges\n2️⃣ Cliquez sur **"Publier une annonce"**\n3️⃣ Choisissez la catégorie\n4️⃣ Ajoutez titre, description, photo, prix\n5️⃣ Publiez !\n\n**Comment acheter :**\n→ Parcourez les annonces\n→ Contactez le vendeur\n→ Effectuez la transaction\n\n💡 Les annonces sont visibles par tous les membres Moftal\n\nℹ️ Pour les restaurants, rendez-vous plutôt dans **Services → Restaurant**.`,
    links: [{ label: 'Tous les échanges', path: '/echange' }, { label: 'Publier une annonce', path: '/echange/publier' }]
  },

  // ── SOLIDARITÉ / ONG ──────────────────────────────────────────────────────
  {
    keywords: [
      'solidarite', 'solidarité', 'aide', 'don', 'humanitaire', 'ong',
      'association', 'benevole', 'bénévole', 'charité', 'charite', 'bénévolat',
      'benevolat', 'soutien', 'entraide', 'collecte'
    ],
    response: `**La Page Solidarité** ❤️\n\nEspace dédié à l'entraide et à la solidarité communautaire :\n\n**Ce que vous pouvez faire :**\n🤝 Trouver des ONG et associations enregistrées sur Moftal\n💝 Faire des dons ou demander de l'aide\n🌍 Participer à des actions humanitaires et communautaires\n👥 Rejoindre des associations de bénévoles\n\n**Tarif spécial ONG :**\n💰 **10 000 GNF/an** (tarif humanitaire préférentiel)\n→ Au lieu du tarif normal des comptes professionnels\n\n**Comment créer un compte ONG :**\n→ Inscription Professionnelle → Type "Solidarité" (ONG)`,
    links: [{ label: 'Page Solidarité', path: '/solidarite' }, { label: 'Inscription ONG', path: '/inscription-pro' }]
  },

  // ── SCIENCE ───────────────────────────────────────────────────────────────
  {
    keywords: [
      'science', 'recherche', 'scientifique', 'decouverte', 'découverte',
      'laboratoire', 'chercheur', 'publication', 'recherches', 'scientifiques',
      'labo', 'experimentation', 'expérimentation'
    ],
    response: `**La Page Science** 🔬\n\nEspace dédié aux publications et découvertes scientifiques :\n\n**Pour les visiteurs :**\n📄 Consultez les publications des scientifiques membres\n🔬 Suivez les recherches en cours\n🧑‍🔬 Connectez-vous avec des chercheurs\n\n**Pour les scientifiques (compte pro) :**\n📝 Publiez vos découvertes et recherches\n🔗 Partagez vos travaux avec la communauté\n📊 Gérez votre vitrine publique\n\n**Créer un compte Scientifique :**\n→ Inscription Professionnelle → Type "Science"`,
    links: [{ label: 'Page Science', path: '/science' }, { label: 'Inscription Scientifique', path: '/inscription-pro' }]
  },

  // ── SÉCURITÉ ──────────────────────────────────────────────────────────────
  {
    keywords: [
      'securite', 'sécurité', 'police', 'protection', 'agence securite',
      'agent securite', 'gardien', 'surveillance', 'garde', 'vigile'
    ],
    response: `**La Page Sécurité** 🛡️\n\nAccédez aux **agences de sécurité** et services de protection enregistrés sur Moftal :\n\n**Fonctionnalités :**\n🛡️ Trouvez des agences de sécurité certifiées\n📋 Prenez contact et demandez leurs services\n✅ Vérifiez les agréments des entreprises\n\n**Pour les agences de sécurité :**\n→ Créez un compte professionnel "Sécurité"\n→ Gérez vos demandes de services\n→ Présentez vos prestations`,
    links: [{ label: 'Page Sécurité', path: '/securite' }, { label: 'Inscription Pro Sécurité', path: '/inscription-pro' }]
  },

  // ── ZAKA / ISLAM ──────────────────────────────────────────────────────────
  {
    keywords: [
      'zaka', 'zakat', 'islam', 'aumone', 'aumône', 'musulman', 'muslim',
      'mosquee', 'mosquée', 'madrasa', 'religion', 'islamique', 'priere',
      'prière', 'sadaka', 'sadaqa'
    ],
    response: `**La Page Zaka (Zakat)** 🕌\n\nSection spécialement réservée aux membres de confession islamique :\n\n**Fonctionnalités :**\n🕌 Calculez et gérez votre Zakat\n💰 Contributions selon les principes islamiques\n🤲 Sadaqa et aumônes\n\n**Établissements religieux sur Moftal :**\n🕌 Mosquées enregistrées\n📚 Madrasas (écoles coraniques)\n\n⚠️ La page Zaka est accessible aux membres ayant un profil Islam.`,
    links: [{ label: 'Page Zaka', path: '/zaka' }]
  },

  // ── HISTOIRE DE L'HUMANITÉ ─────────────────────────────────────────────────
  {
    keywords: [
      'histoire', 'historique', 'humanite', 'humanité', 'civilisation',
      'origines', 'a retenir', 'à retenir', 'generations humanite',
      'g96', 'g1', 'génération', 'generation', '95 generations', 'passe',
      'passé', 'histoire monde'
    ],
    response: `**Les Pages Histoire** 📜\n\n**Histoire de l'Humanité :**\n🌍 Retracez **95 générations** de l'humanité — de G1 (Adam) à aujourd'hui\n📚 Explorez les grandes périodes de la civilisation humaine\n🗺️ Découvrez l'histoire par régions et cultures\n\n**À Retenir (G96) :**\n✍️ La **génération 96** c'est VOUS — la génération actuelle\n📝 Écrivez et partagez votre propre histoire\n🏛️ Laissez une trace pour les générations futures\n\n💡 Chaque membre peut contribuer à l'histoire de sa génération`,
    links: [{ label: "Histoire de l'Humanité", path: '/histoire-humanite' }, { label: 'À Retenir — G96', path: '/a-retenir' }]
  },

  // ── TERRE ADAM ────────────────────────────────────────────────────────────
  {
    keywords: [
      'terre adam', 'pays', 'carte', 'monde', 'territoire', 'geographie',
      'géographie', 'region', 'répartition', 'repartition', 'membres monde',
      'ou vivent', 'où vivent', 'statistiques membres', 'map', 'carte monde'
    ],
    response: `**La Page Terre Adam** 🌍\n\nVisualisez la répartition mondiale des membres Moftal :\n\n🗺️ **Carte interactive** des pays et régions\n📍 Découvrez où vivent les membres de la communauté\n🌐 **Statistiques** : nombre de membres par pays et région\n🌍 Couverture mondiale des Enfants d'Adam\n\n💬 Dans l'onglet **"Lieux"**, chaque utilisateur a aussi accès aux discussions de son **quartier de résidence** (Résidence 1, 2, 3) : urgences, informations, fêtes, réunions...\n\n💡 Plus vous ajoutez des membres dans votre arbre, plus la carte s'enrichit !`,
    links: [{ label: 'Terre Adam', path: '/terre-adam' }]
  },

  // ── CHATS DE QUARTIER / RÉSIDENCE ─────────────────────────────────────────
  {
    keywords: [
      'quartier', 'chat residence', 'chat résidence', 'chats de residence',
      'chats de résidence', 'messagerie residence', 'messagerie résidence',
      'groupe quartier', 'discussion quartier', 'residence 1', 'residence 2',
      'residence 3', 'résidence 1', 'résidence 2', 'résidence 3',
      'urgence quartier', 'reunion quartier', 'réunion quartier',
      'fete quartier', 'fête quartier', 'voisinage', 'voisins'
    ],
    response: `**Discussions de quartier (Résidence)** 🏘️\n\nDans **Terre Adam → onglet "Lieux"**, chaque membre peut rejoindre les discussions de son quartier de résidence, réparties en plusieurs catégories :\n\n🚨 **Urgences** — alertes du quartier\nℹ️ **Informations** — actualités locales\n🎉 **Fêtes & Événements** — célébrations du quartier\n👥 **Réunions** — assemblées de quartier\n\nVous pouvez avoir jusqu'à **3 quartiers de résidence** (Résidence 1, 2, 3) selon les lieux renseignés dans votre profil, chacun avec ses propres discussions.\n\n⚠️ Les niveaux plus larges (sous-préfecture, préfecture, région, pays) affichent uniquement des actualités et projets — pas de messagerie, réservée au niveau quartier.`,
    links: [{ label: 'Terre Adam', path: '/terre-adam' }]
  },

  // ── GALERIE FAMILLE ────────────────────────────────────────────────────────
  {
    keywords: [
      'galerie', 'photo', 'image', 'album', 'photos famille', 'partager photo',
      'ajouter photo', 'voir photos', 'album famille', 'photos partagees',
      'photos partagées'
    ],
    response: `**La Galerie Famille** 📸\n\nPartagez et consultez vos photos de famille en privé :\n\n🖼️ Créez des **albums photos familiaux**\n📤 **Partagez des photos et vidéos** avec vos proches membres\n👨‍👩‍👧 Photos accessibles aux membres de votre famille\n🔒 Espace privé — accessible uniquement à votre famille\n\n**Comment ajouter des photos :**\n1️⃣ Accueil → Famille → Héritage → **Galerie**\n2️⃣ Cliquez sur "＋ Ajouter"\n3️⃣ Sélectionnez vos photos ou vidéos\n4️⃣ Publiez dans l'album`,
    links: [{ label: 'Galerie Famille', path: '/galerie-famille' }, { label: 'Ma Famille', path: '/famille' }]
  },

  // ── MON PROFIL & IDENTITÉ ──────────────────────────────────────────────────
  {
    keywords: [
      'profil', 'mon profil', 'modifier profil', 'informations personnelles',
      'photo profil', 'mes informations', 'modifier mes infos', 'bio', 'biographie',
      'identite', 'identité', 'page identite', 'ma page', 'mon compte',
      'parametres', 'paramètres', 'settings', 'changer photo'
    ],
    response: `**Mon Profil & Mon Identité** 👤\n\nGérez votre présence sur Moftal :\n\n**Page Identité :**\n📸 Photo de profil\n📝 Informations personnelles (prénom, nom, âge, lieu...)\n🌍 Origine et résidence\n💬 Biographie\n\n**Mon Compte :**\n🔐 Paramètres de sécurité\n🔑 Changer le mot de passe\n📊 Votre Numéro H\n⚙️ Préférences du compte\n\n**Comment modifier votre profil :**\n→ Mon Compte → Modifier le profil\n→ Ou directement via la page Identité`,
    links: [{ label: 'Mon Compte', path: '/compte' }, { label: 'Mon Identité', path: '/identite' }, { label: 'Mon Profil', path: '/moi/profil' }]
  },

  // ── GESTION INTERNE (APPLICATION DE L'ÉTABLISSEMENT) ──────────────────────
  {
    keywords: [
      'gestion interne', 'ma gestion', 'application de gestion', 'gerer mon etablissement',
      'gérer mon établissement', 'logiciel de gestion', 'gestion ecole', 'gestion restaurant',
      'gestion clinique', 'gestion boutique', 'gestion entreprise', 'formule gestion'
    ],
    response: `**La Gestion Interne — l'application de votre établissement** ⚙️\n\nAvec la formule **Visibilité + Gestion Interne**, votre établissement a **sa propre application**, à son logo : école, clinique, restaurant, boutique, entreprise, ONG, mosquée, transport…\n\n**Ce qu'on y fait :** élèves, patients, plats, commandes, ventes, stocks, personnel, rapports du mois… selon votre secteur. Tout est enregistré sur le serveur.\n\n**En haut de la gestion :**\n🌐 **Site** — ouvre votre site public (un bouton « ‹ Retour à la gestion » vous ramène)\n💼 **Espace Pro** — messages du site, coordonnées, photos, rendez-vous, publications\n\n**Votre équipe :** ajoutez vos employés avec leur téléphone ou e-mail et choisissez leur accès (limité, complet, tous les droits).\n\n**Partout, même sans connexion :** vous continuez à travailler, tout est envoyé au retour d'internet.\n\nSeule la page « Interfaces » de l'administration Moftal est réservée aux administrateurs de la plateforme.`,
    links: [{ label: 'Mes Comptes Pro', path: '/mes-comptes-pro' }, { label: 'Gestion Interne', path: '/gestion-interne' }]
  },

  // ── AJOUTER DES MEMBRES FAMILLE ────────────────────────────────────────────
  {
    keywords: [
      'ajouter membre', 'ajouter personne', 'ajouter parent', 'ajouter enfant',
      'ajouter conjoint', 'ajouter famille', 'lier compte', 'relier compte',
      'inviter membre', 'invitation famille', 'ajouter proche', 'ajouter frere',
      'ajouter soeur', 'frere', 'sœur', 'soeur', 'cousin', 'oncle', 'tante',
      'grand-parent', 'grandparent', 'grand parent'
    ],
    response: `**Ajouter des membres dans votre Famille** 👪\n\n**Comment ajouter des proches :**\n\n1️⃣ Accueil → Famille → Héritage → **Arbre**\n2️⃣ Sur le schéma de l'arbre, appuyez sur le bouton **"＋"** à côté de la position voulue (Père, Mère, Conjoint(e), Enfant, Frère, Sœur...)\n3️⃣ Entrez le **Numéro H** de la personne (si elle a déjà un compte)\n→ Ou créez un profil sans compte Moftal si elle n'est pas encore inscrite\n\n**Important :**\n→ Dès **5 membres** dans l'arbre : Compte Famille créé automatiquement\n→ Les membres liés voient votre profil dans leur arbre\n→ Demandez leur Numéro H à vos proches pour les lier`,
    links: [{ label: 'Ma Famille', path: '/famille' }, { label: 'Mon Arbre', path: '/famille/moi/arbre' }]
  },

  // ── NOTIFICATIONS ──────────────────────────────────────────────────────────
  {
    keywords: [
      'notification', 'notif', 'alerte', 'message recu', 'message reçu',
      'informer', 'prevenir', 'prévenir', 'je suis pas informé', 'pas de notification'
    ],
    response: `**Les Notifications sur Moftal** 🔔\n\nMoftal vous informe automatiquement des événements importants :\n\n**Types de notifications :**\n✅ Rendez-vous **accepté** par un professionnel\n❌ Rendez-vous **refusé** (avec la raison)\n👥 Invitation à rejoindre un arbre familial\n💬 Nouveau message dans Mes Amours\n📋 Mise à jour de votre compte\n\n**Où voir vos notifications :**\n→ Icône 🔔 en haut de la page\n→ Tableau de bord de votre compte\n\n💡 Assurez-vous que les notifications de votre navigateur sont activées pour Moftal.`,
    links: [{ label: 'Mon Compte', path: '/compte' }]
  },

  // ── NAVIGATION GÉNÉRALE / AIDE ─────────────────────────────────────────────
  {
    keywords: [
      'aide', 'comment', 'utiliser', 'guide', 'tutoriel', 'commencer',
      'debut', 'début', 'que faire', 'bonjour', 'salut', 'hello', 'hi',
      'bonsoir', 'bonne nuit', 'slt', 'bjr', 'cava', 'ça va', 'ca va',
      'je commence', 'nouveau sur', 'premiere visite', 'première visite',
      'perdu', 'debutant', 'débutant', 'pas compris', 'comprend pas'
    ],
    response: `**Bienvenue sur Moftal !** 🌟\n\nJe suis votre **Guide IA officiel** — posez-moi n'importe quelle question sur le site !\n\n**Pour bien démarrer :**\n\n1️⃣ **Créer votre compte** → Choisissez Vivant ou Défunt\n2️⃣ **Vous connecter** avec votre **Numéro H** (votre identifiant unique)\n3️⃣ **Compléter votre profil** → Page Identité\n4️⃣ **Ouvrir "Famille"** depuis l'Accueil → Héritage, Amitié, Récit, Solidarité\n5️⃣ **Découvrir les services** → Terre ADAM, Activité, Échanges, Services\n\n**Questions fréquentes que je peux répondre :**\n🆔 C'est quoi le Numéro H ?\n🌳 Comment construire mon arbre familial ?\n🏥 Comment prendre un rendez-vous médical ?\n💼 Comment créer un compte professionnel ?\n💰 Quels sont les tarifs de Moftal ?\n📧 Comment contacter le support ?\n\nPosez votre question ! 💬`,
    links: [{ label: 'Créer un compte', path: '/choix' }, { label: 'Se connecter', path: '/login' }]
  },

  // ── CONTACT / SUPPORT ────────────────────────────────────────────────────────
  {
    keywords: [
      'contact', 'contacter', 'support', 'aide humaine', 'joindre', 'ecrire a moftal',
      'écrire à moftal', 'email support', 'assistance', 'parler a quelqu\'un',
      'reclamation', 'réclamation', 'signaler probleme', 'signaler un probleme'
    ],
    response: `**Contacter Moftal** 📧\n\nPour toute question, problème ou réclamation, écrivez à :\n\n✉️ **support@moftal.com**\n📞 **+224 625 32 60 37**\n\nVous trouverez aussi ce contact tout en bas de chaque page, dans le pied de page du site.\n\nSi votre question concerne l'utilisation du site (comment faire quelque chose), je peux souvent vous répondre directement ici — n'hésitez pas à me demander !`,
    links: []
  },

  // ── PROBLÈMES TECHNIQUES ────────────────────────────────────────────────────
  {
    keywords: [
      'probleme', 'problème', 'bug', 'erreur', 'marche pas', 'fonctionne pas',
      'ne fonctionne pas', 'bloque', 'bloqué', 'page blanche', 'chargement',
      'lent', 'lente', 'impossible', 'echec', 'échec', 'connexion impossible'
    ],
    response: `**Problème technique ?** 🔧\n\n**Solutions rapides :**\n\n🔄 **Rechargez la page** (F5 ou tirer vers le bas sur mobile)\n\n🌐 **Vérifiez votre connexion internet**\n\n🧹 **Videz le cache :** Paramètres navigateur → Effacer les données\n\n🔓 **Déconnectez-vous et reconnectez-vous** avec votre Numéro H\n\n**Erreurs fréquentes :**\n❌ "Numéro H incorrect" → Vérifiez le format exact de votre NumeroH (ex : G96C1P1R1E1F2 1)\n❌ "Session expirée" → Reconnectez-vous\n❌ "Le site est momentanément indisponible" → Le serveur redémarre, patientez quelques instants puis réessayez\n\n**Si le problème persiste :**\n→ Notez le message d'erreur exact\n→ Contactez le support : support@moftal.com`,
    links: [{ label: 'Se connecter', path: '/login' }, { label: 'Mon Compte', path: '/compte' }]
  },

  // ── ENREGISTREMENT ÉCRIT (STORIES) ────────────────────────────────────────
  {
    keywords: [
      'enregistrement ecrit', 'enregistrement écrit', 'histoire ecrite',
      'histoire écrite', 'story ecrite', 'story écrite', 'temoignage',
      'témoignage', 'ecrire histoire', 'écrire histoire', 'rdv ecrit',
      'rendez-vous ecrit', 'rendez-vous écrit', 'consultation ecrite'
    ],
    response: `**L'Enregistrement Écrit** 📝\n\n**Pour les Rendez-vous :**\nChoisissez "Écrit" lors de la prise de RDV pour :\n✍️ Décrire votre problème ou demande par écrit\n📅 Choisir une date et heure préférées\n🏥 Sélectionner un service spécifique\n\n**Pour votre Histoire Personnelle :**\n→ Rédigez votre témoignage, votre histoire de vie\n→ Visible dans votre profil et votre arbre généalogique\n→ Transmis aux générations futures\n\n**Comment accéder :**\n→ Santé → Choisir un professionnel → Type "Écrit"\n→ Accueil → Famille → Récit`,
    links: [{ label: 'Page Santé', path: '/sante' }, { label: 'Ma Famille', path: '/famille' }]
  },

  // ── DJOMY / PAIEMENT EXTERNE ────────────────────────────────────────────
  {
    keywords: [
      'djomy', 'paiement externe', 'argent reel', 'vrai argent',
      'paiement securise', 'paiement sécurisé', 'comment payer', 'moyen de paiement',
      'mobile money', 'orange money', 'mtn money', 'wave', 'virement'
    ],
    response: `**Comment fonctionne le paiement sur Moftal ?** 💳\n\n**Djomy — Partenaire de paiement :**\n→ Toutes les transactions réelles sont gérées par **Djomy**\n→ Système sécurisé, argent réel\n→ Accepte les moyens de paiement locaux\n\n**Moyens de paiement acceptés :**\n📱 Orange Money, MTN MoMo\n💳 Carte bancaire (Visa/Mastercard)\n\n**Tarifs Moftal :**\n🌳 Arbre 5 ans : 100 000 GNF\n🎓 Professeur IA : 5 000 GNF/mois ou 50 000 GNF/an\n💼 **Comptes Professionnels** (prix par mois, Afrique) :\n→ Visibilité + Rendez-vous : 10 000 GNF (petits secteurs) · 20 000 GNF (écoles, cliniques, fournisseurs, entreprises)\n→ Visibilité + Gestion Interne : 15 000 GNF · 30 000 GNF\n→ 3 mois d'essai gratuit après approbation · hors Afrique : prix doublés\n❤️ ONG : 10 000 GNF/an`,
    links: [{ label: 'Mon Compte', path: '/compte' }]
  },

  // ── MON SITE : COORDONNÉES, PHOTOS, IMAGES ─────────────────────────────────
  {
    keywords: [
      'mon site', 'site vitrine', 'alimenter mon site', 'remplir mon site', 'mettre a jour mon site',
      'coordonnees', 'coordonnées', 'publier mes coordonnees', 'horaires', 'adresse du site',
      'photo du site', 'photos du site', 'photo de couverture', 'couverture', 'galerie',
      'ajouter une photo', 'ajouter des images', 'images du site', 'carreau photo', 'photo produit',
      'photo article', 'photo service', 'photo du bien', 'site vide'
    ],
    response: `**Remplir votre site** 🌐🖼️\n\nC'est vous qui alimentez votre site, depuis votre gestion :\n\n📍 **Coordonnées** — Espace Pro → « Coordonnées du site » (à l'école : rubrique « 🌐 Mon site ») : présentation, téléphone, e-mail, adresse, horaires → **« 📢 Publier sur le site »**.\n\n🖼️ **Photos du site** — Espace Pro → « Photos du site » : ajoutez plusieurs photos, une légende, une rubrique (Nos produits, Nos services, Nos réalisations, Nos locaux, Notre équipe…). La première devient la **photo de couverture** en haut du site ; vous pouvez en choisir une autre (⭐).\n\n📷 **Une photo par article** — à côté de chaque produit, service, plat ou bien, un **carreau en pointillés « 📷 Ajouter une photo »** : touchez-le, choisissez la photo, elle apparaît tout de suite sur le site.\n\n💡 Un site avec des images attire beaucoup plus : mettez une belle couverture et une photo pour chaque article.`,
    links: [{ label: 'Mes Comptes Pro', path: '/mes-comptes-pro' }]
  },

  // ── MESSAGES DU SITE / NOUS ÉCRIRE ─────────────────────────────────────────
  {
    keywords: [
      'nous ecrire', 'nous écrire', 'ecrire a un etablissement', 'écrire à', 'contacter un professionnel',
      'messages du site', 'message du site', 'demande de devis', 'devis', 'demande d information',
      'repondre aux messages', 'marquer traite', 'contacter le restaurant', 'contacter l ecole'
    ],
    response: `**« Nous écrire » et les Messages du site** 📩\n\n**Vous êtes visiteur :** sur le site d'un établissement, touchez **« ✉️ Nous écrire »** (ou « Demander un devis », « Réserver », « Commander »). Donnez votre nom, votre téléphone et votre message → **Envoyer**. Le message arrive directement à l'établissement, qui vous rappelle.\n\n**Vous êtes l'établissement :** vous recevez une notification 🔔. Ouvrez **Espace Pro → « 📩 Messages du site »** : chaque message avec le téléphone (touchez-le pour appeler) et **« ✓ Marquer traité »** quand c'est fait.`,
    links: [{ label: 'Professionnels', path: '/professionnels' }]
  },

  // ── RESTAURANT : MENU, PLATS, COMMANDES ────────────────────────────────────
  {
    keywords: [
      'restaurant', 'menu', 'plat', 'plats', 'ajouter un plat', 'ajouter des plats', 'photo du plat',
      'prix du plat', 'commande', 'commandes', 'commander', 'commander en ligne', 'panier',
      'livraison', 'a emporter', 'à emporter', 'sur place', 'nouvelle commande', 'plat disparu'
    ],
    response: `**Restaurant : menu et commandes** 🍽️\n\n**Ajouter vos plats (gestion → Menu → « + Ajouter plat ») :**\n→ Jusqu'à **10 plats d'un coup** : pour chacun **photo 📷, nom, prix**, catégorie, description\n→ « + Un autre plat » ajoute une ligne, puis **« Enregistrer les N plats »**\n→ Un bilan s'affiche : ✅ enregistrés (visibles tout de suite sur votre site), ou ⚠️ la raison en rouge (ex. « Le prix manque »)\n→ Un plat sans photo ? Touchez **📷 Photo** à côté de lui dans la liste\n\n**Le client commande sur votre site :** « + Ajouter » sur chaque plat → panier en bas → nom, téléphone, à emporter / livraison / sur place → **Envoyer la commande**.\n\n**Vous recevez la commande :** notification 🔔 et onglet **Commandes**, marquée « Nouvelle (à confirmer) », avec le nom, le téléphone et l'adresse du client. Changez ensuite le statut : en préparation → prêt → servi.`,
    links: [{ label: 'Mes Comptes Pro', path: '/mes-comptes-pro' }]
  },

  // ── EMPLOYÉS, PERSONNEL ET ACCÈS ───────────────────────────────────────────
  {
    keywords: [
      'employe', 'employé', 'employes', 'employés', 'personnel', 'ajouter un employe', 'ajouter un employé',
      'acces employe', 'accès employé', 'droits', 'niveau d acces', 'co-responsable', 'coresponsable',
      'acces limite', 'acces complet', 'tous les droits', 'enseignant ajoute', 'ajouter par telephone'
    ],
    response: `**Votre équipe : employés et accès** 👥\n\n**Ajouter quelqu'un :** son **téléphone ou son e-mail suffit** (le NuméroH aussi). S'il n'a pas de compte Moftal, un compte lui est préparé : vous recevez un **code de première connexion** (6 chiffres) à lui donner : il tape ce téléphone / cet e-mail, saisit ce code et choisit son mot de passe. Code perdu ? Bouton « 🔗 Lien » : un nouveau code est donné. Il complète son profil quand il veut — rien ne le bloque.\n\n**Niveaux d'accès :**\n🔹 **Limité** — voir et ajouter, sans modifier ni supprimer\n🔸 **Complet** — tout, sauf les paramètres et les accès\n⭐ **Tous les droits (co-responsable)** — exactement comme le propriétaire\n\nSeul le responsable change les accès. À l'**école / madrasa**, le **Personnel** est la liste des employés : chaque fiche a son « Accès à la gestion » (par défaut : espace enseignant seulement).\n\n**Envoyez-lui le lien de l'application** (« Copier le lien de l'application ») : il l'ouvre, se connecte et l'installe.`,
    links: [{ label: 'Se connecter', path: '/login' }]
  },

  // ── ÉCOLE / MADRASA : ENSEIGNANTS, MATIÈRES, CLASSES, PARENTS ─────────────
  {
    keywords: [
      'ecole', 'école', 'madrasa', 'enseignant', 'enseignants', 'professeur', 'prof', 'eleve', 'élève',
      'eleves', 'élèves', 'classe', 'classes', 'matiere', 'matière', 'matieres', 'matières', 'parent',
      'parents', 'bulletin', 'notes', 'inscription eleve', 'photo enseignant', 'profil enseignant',
      'photo d un enseignant', 'photo de l enseignant', 'photo des enseignants', 'photo du professeur'
    ],
    response: `**École et madrasa** 🏫\n\n**Le site de l'école se remplit avec la gestion :**\n👨‍🏫 **Enseignants** — Personnel → fiche : **photo**, matière, **profil** (ex. « Professeur de mathématiques, licence, 8 ans d'expérience ») et ✔️ « Afficher sur le site ». Sur le site : grande photo, nom, matière, profil.\n📚 **Matières** — celles indiquées sur les fiches des enseignants\n🏫 **Classes** — nom, niveau, places, et une **photo de la salle** (facultative)\n🌐 **Mon site** — coordonnées à publier et photos de l'école\n\n**Ajouter un enseignant :** son téléphone ou son e-mail suffit ; il se connecte et voit **« Mes cours »** (début / fin de chaque cours).\n\n**Parents :** ils ont leur espace **« Mes enfants »** dans l'application de l'école (notes, présences, bulletins, frais) et reçoivent les notifications de l'école.\n\n**Visiteurs :** pré-inscription d'un enfant et « Nous écrire » depuis le site.`,
    links: [{ label: 'Écoles', path: '/ecoles' }, { label: 'Mes Comptes Pro', path: '/mes-comptes-pro' }]
  },

  // ── INSTALLER L'APPLICATION ────────────────────────────────────────────────
  {
    keywords: [
      'installer', 'installation', 'installer l application', 'installer l appli', 'icone', 'icône',
      'ecran d accueil', 'écran d accueil', 'telecharger', 'télécharger', 'application installee',
      'ordinateur', 'pc', 'navigateur', 'lien de l application', 'copier le lien', 'iphone', 'android'
    ],
    response: `**Installer l'application** 📲\n\n**Sur téléphone Android :** ouvrez la gestion → **« 📲 Installer maintenant »**. Si rien ne se passe : menu **⋮** → « Installer l'application » ou « Ajouter à l'écran d'accueil ».\n\n**Sur iPhone :** dans Safari, bouton **Partager ⎙** → « **Sur l'écran d'accueil** » → Ajouter.\n\n**Sur ordinateur :** utilisez **Microsoft Edge** (déjà sur Windows) ou **Google Chrome** :\n→ Edge : menu **⋯** → Applications → « Installer ce site en tant qu'application »\n→ Chrome : icône d'installation à droite de la barre d'adresse (ou menu ⋮ → Caster, enregistrer et partager → Installer la page en tant qu'application)\n⚠️ Certains navigateurs d'ordinateur ne savent pas installer : copiez le lien et ouvrez-le dans Edge ou Chrome.\n\n**Pour vos employés, parents, enseignants, clients :** « 🔗 Copier le lien de l'application » et envoyez-le. En l'ouvrant, ils se connectent puis installent l'application, avec votre logo.`,
    links: [{ label: 'Mes Comptes Pro', path: '/mes-comptes-pro' }]
  },

  // ── SANS CONNEXION (HORS LIGNE) ────────────────────────────────────────────
  {
    keywords: [
      'hors ligne', 'hors connexion', 'sans connexion', 'sans internet', 'pas de connexion',
      'pas d internet', 'offline', 'reseau coupe', 'réseau coupé', 'operations en attente',
      'opérations en attente', 'synchronisation', 'envoi automatique', 'internet', 'pas internet',
      'n ai pas internet', 'sans reseau', 'sans réseau', 'connexion coupee', 'connexion coupée', 'reseau faible'
    ],
    response: `**Travailler sans connexion** 📴\n\nDans les gestions, vous pouvez continuer **même sans internet** :\n→ Ce que vous avez déjà ouvert reste consultable\n→ Ce que vous enregistrez est **gardé sur l'appareil**, puis **envoyé automatiquement au serveur** dès le retour de la connexion\n→ Un bandeau indique : « Hors connexion », « N opération(s) en attente », puis « Synchronisé »\n\nSi le serveur refuse une opération, elle reste affichée avec la raison (rien n'est effacé en silence) : vous pouvez la corriger, la renvoyer ou la retirer.\n\nCertaines actions demandent la connexion : paiement, ajout d'un membre, accès des employés, pointage des cours, commandes et messages envoyés depuis un site.`,
    links: []
  },

  // ── BOUTON SITE / RETOUR À LA GESTION ──────────────────────────────────────
  {
    keywords: [
      'bouton site', 'voir mon site', 'retour a la gestion', 'retour à la gestion', 'revenir a la gestion',
      'revenir à la gestion', 'je suis bloque', 'je suis bloqué', 'pas de bouton retour', 'quitter le site',
      'retour sur moftal', 'revenir sur moftal'
    ],
    response: `**Passer de la gestion au site, et revenir** 🔁\n\n→ Dans la barre en haut de votre gestion, **« 🌐 Site »** ouvre votre site public.\n→ Sur le site, le bouton **« ‹ Retour à la gestion »** (en bas à gauche) vous ramène exactement où vous étiez — même dans l'application installée.\n→ **« Retour sur Moftal »** (avec le petit logo Moftal) vous ramène sur la plateforme Moftal.`,
    links: [{ label: 'Mes Comptes Pro', path: '/mes-comptes-pro' }]
  },

  // ── COMMANDER / RÉSERVER CHEZ UN PRO (VISITEUR) ────────────────────────────
  {
    keywords: [
      'reserver', 'réserver', 'reservation', 'réservation', 'prendre rendez-vous chez', 'acheter chez',
      'commander un produit', 'demander un devis', 'artisan', 'salon de beaute', 'beauté', 'fournisseur',
      'vendeur', 'producteur', 'immobilier', 'louer', 'location maison'
    ],
    response: `**Commander, réserver ou demander un devis** 🛒\n\nSur le site d'un professionnel, chaque article a son bouton :\n🔧 **Artisan** → « Demander un devis »\n💅 **Beauté** → « Réserver »\n🛍️ **Vendeur, producteur, fournisseur, boutique** → « Commander » (le panier de la boutique est envoyé comme commande)\n🏠 **Immobilier** → biens avec photo, prix et quartier ; « Nous écrire » pour une visite\n🍽️ **Restaurant** → panier et commande en ligne\n\nVotre demande arrive directement chez le professionnel (jamais par une autre application) ; il vous rappelle au numéro donné.`,
    links: [{ label: 'Professionnels', path: '/professionnels' }]
  },

  // ── FORMULES (VISIBILITÉ / GESTION INTERNE) ────────────────────────────────
  {
    keywords: [
      'formule', 'formules', 'visibilite', 'visibilité', 'abonnement', 'prix abonnement',
      'gestion interne payante', 'passer a la gestion', 'quelle formule', 'plan pro'
    ],
    response: `**Les deux formules professionnelles** 📦\n\n**1. Visibilité + Rendez-vous**\n→ Votre page publique et les demandes de rendez-vous\n→ Onglets : Demandes · Historique · Paramètres\n\n**2. Visibilité + Gestion Interne**\n→ Tout de la formule 1\n→ **Votre site** complet (couverture, photos, articles, commandes, messages)\n→ **Votre application de gestion**, à votre logo, installable, utilisable sans connexion\n→ Employés avec niveaux d'accès, rapports, Moftal Pay\n\nL'abonnement se gère dans Espace Pro → Paramètres (ou les Paramètres de votre gestion). Vos données restent conservées même si un paiement est en retard.`,
    links: [{ label: 'Inscription Pro', path: '/inscription-pro' }, { label: 'Mes Comptes Pro', path: '/mes-comptes-pro' }]
  },

  // ── VIVANT VS DÉFUNT ────────────────────────────────────────────────────────
  {
    keywords: [
      'vivant', 'defunt', 'défunt', 'mort', 'decede', 'décédé', 'deces',
      'décès', 'difference vivant defunt', 'choisir type compte',
      'type compte', 'quel type', 'vivant ou defunt', 'vivant ou défunt'
    ],
    response: `**Compte Vivant vs Compte Défunt** 🌿🕊️\n\n**Compte Vivant :**\n👤 Pour vous-même, une personne vivante\n🆔 Reçoit un **Numéro H** (ex : G96C1P1R1E1F2 1)\n✅ Accès complet à tous les services\n💬 Peut se connecter et interagir\n\n**Compte Défunt :**\n🕊️ Pour un proche décédé — compte mémoriel\n🆔 Reçoit un **Numéro HD** (format HD-XXXXX)\n📸 Conserve photos, informations et histoire\n👨‍👩‍👧 Géré par un proche vivant\n🌳 Intégré dans l'arbre généalogique familial\n\n**Lequel choisir ?**\n→ **Vous êtes vivant ?** → Compte Vivant\n→ **Pour honorer un proche décédé ?** → Compte Défunt`,
    links: [{ label: 'Créer un compte Vivant', path: '/vivant' }, { label: 'Créer un compte Défunt', path: '/defunt' }]
  },
];

const QUICK_QUESTIONS = [
  { label: '🌍 C\'est quoi Moftal ?', question: "C'est quoi le but de cette application ?" },
  { label: '🆔 Décoder mon NumeroH', question: 'Explique la signification de chaque lettre du NumeroH' },
  { label: '🌳 Mon arbre familial', question: 'Comment construire mon arbre généalogique ?' },
  { label: '🏥 Rendez-vous santé', question: 'Comment prendre un rendez-vous santé ?' },
  { label: '💼 Compte professionnel', question: 'Comment créer un compte professionnel ?' },
  { label: '💰 Tarifs Moftal', question: 'Quels sont les tarifs sur Moftal ?' },
];

interface Message {
  id: number;
  text: string;
  isUser: boolean;
  links?: { label: string; path: string }[];
  timestamp: Date;
}

let _id = 0;

function normalize(str: string) {
  // Accents, apostrophes et ponctuation retirés : « d'un » se lit comme « d un »
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[’'`´]/g, ' ').replace(/[?!.,;:()«»"]/g, ' ').replace(/\s+/g, ' ').trim();
}

function findBestAnswer(question: string) {
  const q = normalize(question);
  const words = q.split(/\s+/).filter(w => w.length > 2);

  let bestScore = 0;
  let bestEntry: typeof SITE_KNOWLEDGE[0] | null = null;

  for (const entry of SITE_KNOWLEDGE) {
    let score = 0;
    for (const kw of entry.keywords) {
      const nkw = normalize(kw);
      if (q.includes(nkw)) {
        score += nkw.length > 5 ? 3 : 2;
      }
    }
    for (const word of words) {
      for (const kw of entry.keywords) {
        if (normalize(kw).includes(word) || word.includes(normalize(kw))) {
          score += 1;
        }
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  if (bestScore >= 2 && bestEntry) {
    return { response: bestEntry.response, links: bestEntry.links };
  }
  return null;
}

function RenderText({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, li, arr) => (
        <span key={li}>
          {line.split(/(\*\*[^*]+\*\*)/g).map((part, pi) =>
            part.startsWith('**') && part.endsWith('**')
              ? <strong key={pi}>{part.slice(2, -2)}</strong>
              : <span key={pi}>{part}</span>
          )}
          {li < arr.length - 1 && <br />}
        </span>
      ))}
    </>
  );
}

export function FloatingGuideIA() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: ++_id,
      text: `Bonjour ! Je suis l'**Assistant Guide** de **Moftal** 🌳\n\nJe connais tout le site : comptes, arbre familial, Numéro H, rendez-vous, services professionnels, paiements, éducation...\n\nPosez-moi n'importe quelle question !`,
      isUser: false,
      links: [],
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const rightMargin = '1.5rem';

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addBot = (text: string, links: { label: string; path: string }[] = []) => {
    setMessages(prev => [...prev, { id: ++_id, text, isUser: false, links, timestamp: new Date() }]);
  };

  const handleSend = async (questionText?: string) => {
    const q = (questionText ?? input).trim();
    if (!q || loading) return;
    setInput('');
    setShowSuggestions(false);
    setMessages(prev => [...prev, { id: ++_id, text: q, isUser: true, links: [], timestamp: new Date() }]);
    setLoading(true);

    const local = findBestAnswer(q);
    if (local) {
      setTimeout(() => { addBot(local.response, local.links); setLoading(false); }, 400);
      return;
    }

    setTimeout(() => {
      addBot(
        `Je n'ai pas trouvé de réponse précise à votre question.\n\nEssayez des mots comme : "Numéro H", "arbre familial", "rendez-vous", "compte professionnel", "G96", "génération"...\n\nOu cliquez sur un sujet ci-dessous :`,
        [
          { label: '🌍 Présentation Moftal', path: '/choix' },
          { label: '🆔 Numéro H', path: '/login' },
          { label: '🌳 Arbre familial', path: '/famille' },
          { label: '🏥 Santé / RDV', path: '/sante' },
          { label: '💼 Comptes pro', path: '/inscription-pro' },
        ]
      );
      setLoading(false);
    }, 500);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const goTo = (path: string) => { setOpen(false); navigate(path); };

  return (
    <>
      {/* ── Bouton — icône au-dessus du texte (empilés) pour se rapprocher d'un cercle
          plutôt qu'une pilule allongée, tout en gardant "Guide IA" lisible dedans ── */}
      <button
        aria-label="Assistant IA - Guide du site"
        onClick={() => setOpen(o => !o)}
        className="flex flex-col items-center justify-center gap-0 shrink-0 rounded-full w-9 h-9 text-[6px] leading-none font-semibold text-white transition-all hover:scale-105 active:scale-95 select-none overflow-hidden"
        style={{
          background: 'linear-gradient(135deg,#1a8f1a 0%,#156315 50%,#0f4b0f 100%)',
          boxShadow: open
            ? '0 4px 16px rgba(34,167,34,0.6)'
            : '0 4px 16px rgba(34,167,34,0.35)',
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width={12} height={12} fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Guide IA
      </button>

      {/* ── Panel chat — reste en survol fixe pour rester utilisable en scrollant ── */}
      {open && (
        <div
          className="fixed z-[59] flex flex-col rounded-2xl overflow-hidden"
          style={{
            bottom: `calc(env(safe-area-inset-bottom, 0px) + 1.5rem)`,
            right: `calc(env(safe-area-inset-right, 0px) + ${rightMargin})`,
            width: 'min(400px, calc(100vw - 2rem))',
            height: 'min(600px, calc(100vh - 120px))',
            background: '#fff',
            border: '1.5px solid rgba(34,167,34,0.25)',
            boxShadow: '0 24px 64px rgba(34,167,34,0.2)',
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#1a8f1a 0%,#156315 100%)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.2)', fontSize: 20 }}>🌳</div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm leading-tight">Assistant IA</p>
              <p className="text-green-200 text-[11px]">Moftal • Guide officiel</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-lime-300 animate-pulse" />
                <span className="text-white/80 text-[11px]">En ligne</span>
              </div>
              <button
                aria-label="Fermer l'assistant"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center rounded-lg transition-all hover:scale-110 active:scale-95"
                style={{
                  width: 30, height: 30,
                  background: 'rgba(255,255,255,0.2)',
                  border: '1.5px solid rgba(255,255,255,0.5)',
                  marginLeft: 4,
                  flexShrink: 0,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.8" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Zone messages */}
          <div
            className="flex-1 overflow-y-auto px-3 py-3 space-y-3"
            style={{ background: 'linear-gradient(180deg,#f0fdf0 0%,#f7fef9 100%)' }}
          >
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
                {!msg.isUser && (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-0.5"
                    style={{ background: 'linear-gradient(135deg,#1a8f1a,#156315)', fontSize: 13 }}
                  >🌿</div>
                )}
                <div className="max-w-[85%] space-y-2">
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.isUser ? 'text-white rounded-tr-sm' : 'text-gray-800 rounded-tl-sm shadow-sm'
                    }`}
                    style={msg.isUser
                      ? { background: 'linear-gradient(135deg,#1a8f1a,#156315)' }
                      : { background: '#fff', border: '1px solid rgba(34,167,34,0.15)' }
                    }
                  >
                    <RenderText text={msg.text} />
                  </div>

                  {msg.links && msg.links.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pl-1">
                      {msg.links.map((lnk, i) => (
                        <button
                          key={i}
                          onClick={() => goTo(lnk.path)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all hover:shadow-md active:scale-95"
                          style={{
                            background: 'linear-gradient(135deg,#dcfcdc,#bbf7bb)',
                            borderColor: '#86efac',
                            color: '#156315',
                          }}
                        >
                          {lnk.label} →
                        </button>
                      ))}
                    </div>
                  )}

                  <p className={`text-[10px] px-1 text-gray-400 ${msg.isUser ? 'text-right' : ''}`}>
                    {msg.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {/* Loader */}
            {loading && (
              <div className="flex justify-start">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center mr-2 flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#1a8f1a,#156315)', fontSize: 13 }}
                >🌿</div>
                <div
                  className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm"
                  style={{ border: '1px solid rgba(34,167,34,0.15)' }}
                >
                  <div className="flex gap-1 items-center">
                    {[0, 150, 300].map(d => (
                      <div
                        key={d}
                        className="w-2 h-2 rounded-full animate-bounce"
                        style={{ background: '#1a8f1a', animationDelay: `${d}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions rapides */}
          {showSuggestions && (
            <div
              className="px-3 py-2 flex-shrink-0 border-t"
              style={{ borderColor: 'rgba(34,167,34,0.15)', background: '#f0fdf0' }}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#1a8f1a' }}>
                Questions fréquentes
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(q.question)}
                    className="px-2.5 py-1.5 text-[11px] font-medium rounded-xl border transition-all hover:shadow-sm active:scale-95"
                    style={{ background: '#fff', borderColor: '#bbf7bb', color: '#156315' }}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Zone de saisie */}
          <div
            className="px-3 py-3 border-t flex-shrink-0 bg-white"
            style={{ borderColor: 'rgba(34,167,34,0.15)' }}
          >
            <div className="flex gap-2 items-center">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Posez votre question..."
                disabled={loading}
                className="flex-1 px-4 py-2.5 text-sm rounded-xl border-2 focus:outline-none transition-colors disabled:opacity-50"
                style={{
                  borderColor: input ? '#1a8f1a' : '#bbf7bb',
                  background: '#f0fdf0',
                }}
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40 hover:scale-105 active:scale-95"
                style={{ background: 'linear-gradient(135deg,#1a8f1a,#156315)' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
            <p className="text-center text-[10px] mt-1.5" style={{ color: '#86efac' }}>
              Moftal • Assistant IA
            </p>
          </div>
        </div>
      )}
    </>
  );
}
