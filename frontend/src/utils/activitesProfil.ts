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
  { groupe: "Autorités & Administration", activites: [
    "Chef de quartier", "Chef de secteur", "Chef de village", "Chef de district",
    "Sous-préfet", "Préfet", "Gouverneur", "Maire", "Conseiller communal",
    "Député", "Ministre", "Président", "Diplomate/Ambassadeur", "Magistrat/Juge",
    "Administration", "Secrétaire",
  ] },
  { groupe: "Religion", activites: [
    "Imam/Prédicateur", "Muezzin", "Prêtre/Pasteur", "Chef religieux",
  ] },
  { groupe: "Défense & Sécurité", activites: [
    "Militaire", "Gendarme", "Policier/Policière", "Douanier", "Pompier", "Sécurité",
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
