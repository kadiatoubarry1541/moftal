import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

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
    links: [{ label: "Créer un compte Défunt", path: '/choix' }, { label: 'Inscription', path: '/inscription-defunt' }]
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
    links: [{ label: 'Créer un compte', path: '/choix' }, { label: 'Inscription Vivant', path: '/inscription-vivant' }, { label: 'Inscription Défunt', path: '/inscription-defunt' }]
  },

  // ── CONNEXION ──────────────────────────────────────────────────────────────
  {
    keywords: [
      'connecter', 'connexion', 'login', 'se connecter', 'acceder', 'accéder',
      'entrer', 'ouvrir session', 'je veux me connecter', 'comment je me connecte',
      'comment acceder', 'entrer dans mon compte', 'rejoindre mon compte'
    ],
    response: `**Comment se connecter sur Moftal ?** 🔐\n\n**Étapes :**\n1️⃣ Cliquez sur **"Connexion"**\n2️⃣ Entrez votre **Numéro H** (ex: G96C1P1R1E1F2 1)\n3️⃣ Entrez votre **mot de passe**\n4️⃣ Cliquez sur **"Se connecter"**\n\n💡 **Astuce :** Votre identifiant est votre Numéro H — ce n'est pas un email !\n\n**Format du Numéro H :** G{génération}C{continent}P{pays}R{région}E{ethnie}F{famille} {séquence}\n\n**Problèmes fréquents :**\n❌ "Numéro incorrect" → Vérifiez le format exact de votre NumeroH\n❌ "Mot de passe incorrect" → Utilisez le lien "Mot de passe oublié"\n❌ "Compte introuvable" → Vérifiez que vous êtes bien inscrit`,
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
    response: `**La Page Famille** 👨‍👩‍👧‍👦\n\nC'est le **cœur de Moftal** ! La page Famille donne accès à tout votre univers familial :\n\n🌳 **Mon Arbre Généalogique** — Visualisez et construisez votre arbre\n👨‍👩 **Mes Parents** — Père, mère et leurs informations\n👶 **Mes Enfants** — Gérez vos enfants\n💑 **Mon Partenaire** — Conjoint(e) et messagerie privée\n❤️ **Mes Amours** — Messagerie chiffrée avec votre conjoint(e)\n📸 **Galerie Famille** — Albums photos partagés\n🏠 **Compte Famille** — Créé automatiquement dès 5 membres\n\n**La Page Famille est accessible depuis le menu principal.**`,
    links: [{ label: 'Ma Famille', path: '/famille' }, { label: 'Mon Arbre', path: '/famille/moi/arbre' }]
  },

  // ── ARBRE GÉNÉALOGIQUE ─────────────────────────────────────────────────────
  {
    keywords: [
      'arbre', 'genealogique', 'généalogique', 'arbre familial', 'ascendance',
      'descendance', 'lignee', 'lignée', 'ancetres', 'ancêtres', 'generations',
      'générations', 'arbre genea', 'genealogie', 'généalogie', 'construire arbre',
      'creer arbre', 'voir arbre', 'afficher arbre', 'visualiser famille'
    ],
    response: `**L'Arbre Généalogique** 🌳\n\nVisualisez et construisez votre arbre familial sur Moftal :\n\n**Comment ajouter des membres :**\n👨 **Ajouter un père/mère** → Bouton "+" dans la section Parents\n👶 **Ajouter un enfant** → Bouton "+" dans la section Enfants\n💑 **Ajouter un(e) conjoint(e)** → Section Partenaire\n\n**Activation de l'arbre :**\n💰 L'arbre complet s'active pour **100 000 GNF / 5 ans**\n→ Options disponibles : 5 / 10 / 15 / 20 ans\n→ Sans activation, les fonctions restent limitées\n\n**Compte Famille automatique :**\n→ Dès que vous ajoutez **5 membres** dans l'arbre, un **Compte Famille** est créé automatiquement\n→ Vous recevez un **Numéro Sang** (ex: F2S1) — identifiant unique de votre lignée\n\n**Voir votre arbre :**\n→ Famille → Mon Arbre Généalogique`,
    links: [{ label: 'Mon Arbre Généalogique', path: '/famille/moi/arbre' }, { label: 'Ma Famille', path: '/famille' }]
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
    response: `**Mes Amours — Messagerie Privée Couple** ❤️\n\n"Mes Amours" est la **messagerie privée** entre vous et votre conjoint(e) sur Moftal.\n\n**Fonctionnalités :**\n💬 Échange de messages privés\n🖼️ Partage de photos\n🔒 Conversation privée (accessible uniquement au couple)\n\n**Comment y accéder :**\n→ Page Famille → Mes Amours\n→ Ou depuis votre profil partenaire\n\n**Prérequis :**\n→ Avoir un(e) partenaire lié(e) dans votre arbre familial\n→ Le/la partenaire doit avoir un compte Moftal actif`,
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
    response: `**Moftal Pay — Système de Paiement** 💰\n\n**Activation de l'Arbre Généalogique :**\n💰 **100 000 GNF = 5 ans** d'accès complet\n\nOptions de durée disponibles :\n| Durée | Prix |\n|-------|------|\n| 5 ans | 100 000 GNF |\n| 10 ans | 200 000 GNF |\n| 15 ans | 300 000 GNF |\n| 20 ans | 400 000 GNF |\n\n⚠️ L'abonnement est **renouvelable** (PAS à vie)\n\n**Autres tarifs :**\n🏥 **Compte Professionnel Standard** : 500 000 GNF/an\n❤️ **ONG/Associations** : 10 000 GNF/an (tarif humanitaire spécial)\n🎓 **Professeur IA** : 5 000 GNF/mois ou 50 000 GNF/an\n\n**Wallet Pro :**\n→ Disponible pour les comptes Santé (clinic) et Alimentation (supplier)\n→ Les autres types : "Bientôt disponible"\n\n🔒 Les paiements réels sont gérés par Lengopay (externe au site)`,
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
      'pro', 'professionnel', 'compte pro', 'espace pro', 'inscription pro',
      'creer compte pro', 'créer compte pro', 'dashboard pro', 'espace professionnel',
      'mon espace pro', 'gerer mon compte pro', 'compte enterprise',
      'compte clinique', 'professionnel inscription'
    ],
    response: `**Les Comptes Professionnels** 💼\n\nEnregistrez votre activité professionnelle sur Moftal :\n\n**Types de comptes disponibles :**\n🏥 **Santé** — Médecins, cliniques, hôpitaux\n🏢 **Activité** — Entreprises, écoles, établissements\n🔬 **Science** — Chercheurs, laboratoires, scientifiques\n❤️ **Solidarité** — ONG, associations humanitaires\n🛡️ **Sécurité** — Agences de sécurité, protection\n🛒 **Échanges** — Fournisseurs, journalistes\n🕌 **Mosquée/Madrasa** — Établissements religieux\n🏪 **Commerce** — Boutiques, vendeurs, producteurs\n🍽️ **Restaurant** — Établissements de restauration\n🚌 **Transport** — Compagnies de transport\n💄 **Beauté** — Salons de beauté, coiffeurs\n🛠️ **Artisan** — Artisans et métiers manuels\n🏛️ **Mairie** — Collectivités locales\n\n**Étapes d'inscription pro :**\n1️⃣ Cliquez sur "Inscription Professionnelle"\n2️⃣ Choisissez votre type\n3️⃣ Renseignez les informations de votre organisation\n4️⃣ Soumettez pour validation`,
    links: [{ label: 'Inscription Professionnelle', path: '/inscription-pro' }, { label: 'Mes Comptes Pro', path: '/mes-comptes-pro' }, { label: 'Liste Professionnels', path: '/professionnels' }]
  },

  // ── ESPACE PRO / DASHBOARD ─────────────────────────────────────────────────
  {
    keywords: [
      'tableau de bord', 'dashboard', 'mes demandes', 'gerer rdv', 'gérer rdv',
      'accepter rdv', 'refuser rdv', 'historique rdv', 'espace pro dashboard',
      'voir mes rendez-vous', 'mes patients', 'notifications pro'
    ],
    response: `**L'Espace Professionnel (Dashboard)** 📊\n\nChaque compte professionnel dispose d'un tableau de bord complet :\n\n**Onglet Demandes :**\n📋 Liste de toutes les demandes de RDV reçues\n✅ **Accepter** — Confirmer le rendez-vous\n🎥 **Accepter + Vidéo** — Accepter avec une réponse vidéo\n❌ **Refuser** — Refuser avec une raison optionnelle\n\n**Onglet Historique :**\n📁 Tous vos anciens RDV (Acceptés / Refusés / Tous)\n\n**Onglet Profil :**\nℹ️ Informations de votre compte pro\n🔧 Services et spécialités proposés\n\n**Statistiques :**\n📊 Total RDV / En attente / Acceptés / Refusés\n\n**Vitrine publique :**\n→ Chaque compte pro a une page publique accessible par les membres`,
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
    response: `**La Page Solidarité** ❤️\n\nEspace dédié à l'entraide et à la solidarité communautaire :\n\n**Ce que vous pouvez faire :**\n🤝 Trouver des ONG et associations enregistrées sur Moftal\n💝 Faire des dons ou demander de l'aide\n🌍 Participer à des actions humanitaires et communautaires\n👥 Rejoindre des associations de bénévoles\n\n**Tarif spécial ONG :**\n💰 **10 000 GNF/an** (tarif humanitaire préférentiel)\n→ Au lieu de 500 000 GNF/an pour les autres pro\n\n**Comment créer un compte ONG :**\n→ Inscription Professionnelle → Type "Solidarité" (ONG)`,
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
    response: `**La Page Terre Adam** 🌍\n\nVisualisez la répartition mondiale des membres Moftal :\n\n🗺️ **Carte interactive** des pays et régions\n📍 Découvrez où vivent les membres de la communauté\n🌐 **Statistiques** : nombre de membres par pays et région\n🌍 Couverture mondiale des Enfants d'Adam\n\n💡 Plus vous ajoutez des membres dans votre arbre, plus la carte s'enrichit !`,
    links: [{ label: 'Terre Adam', path: '/terre-adam' }]
  },

  // ── GALERIE FAMILLE ────────────────────────────────────────────────────────
  {
    keywords: [
      'galerie', 'photo', 'image', 'album', 'photos famille', 'partager photo',
      'ajouter photo', 'voir photos', 'album famille', 'photos partagees',
      'photos partagées'
    ],
    response: `**La Galerie Famille** 📸\n\nPartagez et consultez vos photos de famille en privé :\n\n🖼️ Créez des **albums photos familiaux**\n📤 **Partagez des photos** avec vos proches membres\n👨‍👩‍👧 Photos accessibles aux membres de votre famille\n🔒 Espace privé — accessible uniquement à votre famille\n\n**Comment ajouter des photos :**\n1️⃣ Famille → Galerie Famille\n2️⃣ Cliquez sur "Ajouter"\n3️⃣ Sélectionnez vos photos\n4️⃣ Publiez dans l'album`,
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

  // ── GESTION INTERNE (ADMIN) ────────────────────────────────────────────────
  {
    keywords: [
      'gestion interne', 'admin', 'administration', 'administrateur',
      'gestion admin', 'panneau admin', 'back office', 'backoffice',
      'moderation', 'modération', 'gerer membres', 'gérer membres'
    ],
    response: `**La Gestion Interne** ⚙️\n\nLa Gestion Interne est le **panneau d'administration** réservé aux administrateurs Moftal.\n\n**Fonctionnalités (admins uniquement) :**\n👥 Gestion des membres et comptes\n💼 Validation des comptes professionnels\n📊 Statistiques de la plateforme\n🔧 Configuration des services\n📝 Gestion des contenus\n\n⚠️ **Accès restreint** — Réservé aux administrateurs officiels de Moftal.\n\nSi vous pensez avoir besoin d'un accès admin, contactez l'équipe Moftal.`,
    links: [{ label: 'Gestion Interne', path: '/gestion-interne' }]
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
    response: `**Ajouter des membres dans votre Famille** 👪\n\n**Comment ajouter des proches :**\n\n👨‍👩 **Parents (père/mère) :**\n→ Famille → Mes Parents → Ajouter\n→ Entrez le Numéro H du parent (s'il a un compte)\n→ Ou créez un profil sans compte Moftal\n\n👶 **Enfants :**\n→ Famille → Mes Enfants → Ajouter\n→ Entrez le Numéro H de l'enfant\n\n💑 **Conjoint(e) :**\n→ Famille → Mon Partenaire → Ajouter\n→ Entrez le Numéro H du/de la conjoint(e)\n\n**Important :**\n→ Dès **5 membres** dans l'arbre : Compte Famille créé automatiquement\n→ Les membres liés voient votre profil dans leur arbre\n→ Demandez leur Numéro H à vos proches pour les lier`,
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
    response: `**Bienvenue sur Moftal !** 🌟\n\nJe suis votre **Guide IA officiel** — posez-moi n'importe quelle question sur le site !\n\n**Pour bien démarrer :**\n\n1️⃣ **Créer votre compte** → Choisissez Vivant ou Défunt\n2️⃣ **Vous connecter** avec votre **Numéro H** (votre identifiant unique)\n3️⃣ **Compléter votre profil** → Page Identité\n4️⃣ **Construire votre arbre familial** → Page Famille\n5️⃣ **Découvrir les services** → Santé, Échanges, Éducation, Science...\n\n**Questions fréquentes que je peux répondre :**\n🆔 C'est quoi le Numéro H ?\n🌳 Comment construire mon arbre familial ?\n🏥 Comment prendre un rendez-vous médical ?\n💼 Comment créer un compte professionnel ?\n💰 Quels sont les tarifs de Moftal ?\n\nPosez votre question ! 💬`,
    links: [{ label: 'Créer un compte', path: '/choix' }, { label: 'Se connecter', path: '/login' }]
  },

  // ── PROBLÈMES TECHNIQUES ────────────────────────────────────────────────────
  {
    keywords: [
      'probleme', 'problème', 'bug', 'erreur', 'marche pas', 'fonctionne pas',
      'ne fonctionne pas', 'bloque', 'bloqué', 'page blanche', 'chargement',
      'lent', 'lente', 'impossible', 'echec', 'échec', 'connexion impossible'
    ],
    response: `**Problème technique ?** 🔧\n\n**Solutions rapides :**\n\n🔄 **Rechargez la page** (F5 ou tirer vers le bas sur mobile)\n\n🌐 **Vérifiez votre connexion internet**\n\n🧹 **Videz le cache :** Paramètres navigateur → Effacer les données\n\n🔓 **Déconnectez-vous et reconnectez-vous** avec votre Numéro H\n\n**Erreurs fréquentes :**\n❌ "Numéro H incorrect" → Vérifiez le format : H-XXXXX (avec le H majuscule et le tiret)\n❌ "Session expirée" → Reconnectez-vous\n❌ "Erreur serveur" → Réessayez dans quelques minutes\n\n**Si le problème persiste :**\n→ Notez le message d'erreur exact\n→ Contactez le support Moftal`,
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
    response: `**L'Enregistrement Écrit** 📝\n\n**Pour les Rendez-vous :**\nChoisissez "Écrit" lors de la prise de RDV pour :\n✍️ Décrire votre problème ou demande par écrit\n📅 Choisir une date et heure préférées\n🏥 Sélectionner un service spécifique\n\n**Pour votre Histoire Personnelle :**\n→ Rédigez votre témoignage, votre histoire de vie\n→ Visible dans votre profil et votre arbre généalogique\n→ Transmis aux générations futures\n\n**Comment accéder :**\n→ Santé → Choisir un professionnel → Type "Écrit"\n→ Famille → Mon Histoire`,
    links: [{ label: 'Page Santé', path: '/sante' }, { label: 'Ma Famille', path: '/famille' }]
  },

  // ── DJOMY / PAIEMENT EXTERNE ────────────────────────────────────────────
  {
    keywords: [
      'djomy', 'paiement externe', 'argent reel', 'vrai argent',
      'paiement securise', 'paiement sécurisé', 'comment payer', 'moyen de paiement',
      'mobile money', 'orange money', 'mtn money', 'wave', 'virement'
    ],
    response: `**Comment fonctionne le paiement sur Moftal ?** 💳\n\n**Djomy — Partenaire de paiement :**\n→ Toutes les transactions réelles sont gérées par **Djomy**\n→ Système sécurisé, argent réel\n→ Accepte les moyens de paiement locaux\n\n**Moyens de paiement acceptés :**\n📱 Orange Money, MTN MoMo\n💳 Carte bancaire (Visa/Mastercard)\n\n**Tarifs Moftal :**\n🌳 Arbre 5 ans : 100 000 GNF\n🎓 Professeur IA : 5 000 GNF/mois ou 50 000 GNF/an\n💼 Compte Pro standard : 500 000 GNF/an\n❤️ ONG : 10 000 GNF/an`,
    links: [{ label: 'Mon Compte', path: '/compte' }]
  },

  // ── VIVANT VS DÉFUNT ────────────────────────────────────────────────────────
  {
    keywords: [
      'vivant', 'defunt', 'défunt', 'mort', 'decede', 'décédé', 'deces',
      'décès', 'difference vivant defunt', 'choisir type compte',
      'type compte', 'quel type', 'vivant ou defunt', 'vivant ou défunt'
    ],
    response: `**Compte Vivant vs Compte Défunt** 🌿🕊️\n\n**Compte Vivant :**\n👤 Pour vous-même, une personne vivante\n🆔 Reçoit un **Numéro H** (format H-XXXXX)\n✅ Accès complet à tous les services\n💬 Peut se connecter et interagir\n\n**Compte Défunt :**\n🕊️ Pour un proche décédé — compte mémoriel\n🆔 Reçoit un **Numéro HD** (format HD-XXXXX)\n📸 Conserve photos, informations et histoire\n👨‍👩‍👧 Géré par un proche vivant\n🌳 Intégré dans l'arbre généalogique familial\n\n**Lequel choisir ?**\n→ **Vous êtes vivant ?** → Compte Vivant\n→ **Pour honorer un proche décédé ?** → Compte Défunt`,
    links: [{ label: 'Créer un compte Vivant', path: '/inscription-vivant' }, { label: 'Créer un compte Défunt', path: '/inscription-defunt' }]
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
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
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
  const location = useLocation();
  // Terre ADAM a sa propre barre fixe en bas (les 5 niveaux) — on remonte le
  // bouton flottant pour ne pas se superposer avec elle.
  const extraBottomOffset = location.pathname === '/terre-adam' ? 64 : 0;

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
      {/* ── Bouton flottant ── */}
      <button
        aria-label="Assistant IA - Guide du site"
        onClick={() => setOpen(o => !o)}
        className="fixed z-[60] flex items-center justify-center rounded-full transition-all duration-300 hover:scale-110 active:scale-95 select-none"
        style={{
          bottom: `calc(env(safe-area-inset-bottom, 0px) + 1.5rem + ${extraBottomOffset}px)`,
          right: 'calc(env(safe-area-inset-right, 0px) + 1.5rem)',
          width: 60, height: 60,
          background: 'linear-gradient(135deg,#1a8f1a 0%,#156315 50%,#0f4b0f 100%)',
          boxShadow: open
            ? '0 8px 32px rgba(34,167,34,0.7)'
            : '0 8px 32px rgba(34,167,34,0.45)',
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {/* ── Tooltip ── */}
      {!open && (
        <div
          className="fixed z-[59] px-3 py-1 rounded-xl text-xs font-semibold text-white pointer-events-none"
          style={{
            bottom: `calc(env(safe-area-inset-bottom, 0px) + 1.5rem + 68px + ${extraBottomOffset}px)`,
            right: 'calc(env(safe-area-inset-right, 0px) + 1.5rem)',
            background: 'linear-gradient(135deg,#1a8f1a,#156315)',
            whiteSpace: 'nowrap',
            opacity: 0.9,
          }}
        >
          Guide IA
        </div>
      )}

      {/* ── Panel chat ── */}
      {open && (
        <div
          className="fixed z-[59] flex flex-col rounded-2xl overflow-hidden"
          style={{
            bottom: `calc(env(safe-area-inset-bottom, 0px) + 1.5rem + 72px + ${extraBottomOffset}px)`,
            right: 'calc(env(safe-area-inset-right, 0px) + 1.5rem)',
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
