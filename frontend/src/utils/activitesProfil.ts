// Liste unique des activités du profil — utilisée partout où l'on choisit
// une activité (mise à jour du profil, inscription par écrit). Les valeurs
// déjà enregistrées en base restent identiques (groupes d'activité, icônes).
export const ACTIVITES_PROFIL: { groupe: string; activites: string[] }[] = [
  { groupe: "Santé & Médecine", activites: [
    "Santé", "Médecin", "Infirmier/Infirmière", "Pharmacien", "Sage-femme", "Dentiste",
    "Psychologue/Thérapeute", "Kiné/Physiothérapeute", "Vétérinaire", "Opticien",
    "Aide-soignant(e)", "Laborantin(e)", "Tradipraticien",
  ] },
  { groupe: "Éducation", activites: [
    "Écolier/Écolière", "Élève", "Étudiant", "Enseignant/Enseignante",
    "Professeur/Formateur", "Directeur/Directrice d'école", "Maître coranique",
    "Chercheur/Scientifique",
  ] },
  // Titres officiels : l'administrateur peut bloquer une activité choisie à tort
  // (écran admin « Chefs & maires »). Les valeurs déjà enregistrées restent.
  { groupe: "État & Gouvernement", activites: [
    "Président de la République", "Vice-président", "Premier ministre", "Ministre",
    "Président de l'Assemblée nationale", "Député", "Sénateur",
    "Secrétaire général de ministère", "Chef de cabinet", "Conseiller à la présidence",
    "Conseiller de ministre", "Directeur national", "Diplomate/Ambassadeur", "Consul",
    "Magistrat/Juge", "Procureur",
  ] },
  { groupe: "Autorités locales", activites: [
    "Gouverneur", "Préfet", "Secrétaire général de préfecture", "Sous-préfet",
    "Maire", "Adjoint au maire", "Président de CRD", "Conseiller régional", "Conseiller communal",
    "Directeur régional", "Directeur préfectoral", "Chef de canton",
    "Chef de quartier", "Chef de secteur", "Chef de village", "Chef de district",
  ] },
  { groupe: "Notables & Communauté", activites: [
    "Chef coutumier", "Sage/Notable", "Doyen du quartier", "Président des jeunes",
    "Présidente des femmes", "Responsable d'association", "Responsable d'ONG",
  ] },
  { groupe: "Administration", activites: [
    "Président", "Administration", "Fonctionnaire", "Agent municipal", "Inspecteur", "Secrétaire",
  ] },
  { groupe: "Religion", activites: [
    "Imam/Prédicateur", "Muezzin", "Prêtre/Pasteur", "Chef religieux",
  ] },
  { groupe: "Défense & Sécurité", activites: [
    "Militaire", "Officier (armée)", "Général", "Gendarme", "Commissaire de police", "Policier/Policière", "Douanier", "Pompier", "Sécurité",
  ] },
  { groupe: "Droit, Finance & Gestion", activites: [
    "Avocat/Juriste", "Comptable/Auditeur", "Économiste", "Banque/Finance", "Assurance",
    "Agent immobilier", "Notaire/Huissier", "Chef d'entreprise/Entrepreneur",
  ] },
  { groupe: "Numérique & Tech", activites: [
    "Informatique", "Développeur/Programmeur", "Graphiste/Designer", "Cybersécurité",
    "Télécommunications",
  ] },
  { groupe: "BTP & Artisanat", activites: [
    "Construction", "Maçonnerie", "Menuiserie", "Électricité", "Plomberie",
    "Soudure/Métallurgie", "Climatisation/Froid", "Peinture en bâtiment", "Carrelage",
    "Mécanique", "Artisanat", "Couture", "Forgeron", "Cordonnier", "Bijoutier",
  ] },
  { groupe: "Commerce & Transport", activites: [
    "Commerce", "Import/Export", "Marketing/Communication",
    "Transport", "Taxi-moto", "Logistique", "Journalisme",
  ] },
  { groupe: "Agriculture & Alimentation", activites: [
    "Agriculture", "Maraîchage", "Élevage", "Pêche", "Boulangerie/Pâtisserie",
    "Restauration", "Agroalimentaire",
  ] },
  { groupe: "Services", activites: [
    "Coiffure", "Hôtellerie/Tourisme", "Photographie/Vidéo", "Sport/Coach sportif",
    "Ingénierie", "Architecture", "Environnement/Écologie", "Travail social",
    "Traducteur/Interprète", "Agent d'entretien", "Employé(e) de maison",
  ] },
  { groupe: "Situation", activites: [
    "Au foyer", "Sans emploi", "En recherche d'emploi", "Retraité",
  ] },
];
