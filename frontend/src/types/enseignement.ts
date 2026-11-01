// Données de la gestion interne d'une école ou d'une madrasa, telles que le serveur
// les renvoie (backend/src/routes/school-management.js et madrasa-management.js).
// Les deux ont presque les mêmes tables : les champs propres à l'une sont facultatifs.
// Les montants et notes NUMERIC arrivent souvent en texte : on les lit avec Number(…) ou +….

export type Nombre = number | string;

export interface EtablissementEnseignement {
  tenant_code: string;
  name: string;
  owner_numero_h?: string;
  is_active?: boolean;
  logo_url?: string | null;
  address?: string;
  phone?: string;
  email?: string;
  description?: string;
  horaires?: string;
  phone_urgence?: string;
  /** Accès du membre connecté : « total » pour le co-responsable */
  acces_employe?: string | null;
}

/** Tableau de bord (/dashboard) : chiffres du jour et du mois */
export interface StatsEnseignement {
  success?: boolean;
  message?: string;
  totalStudents?: number;
  totalStaff?: number;
  totalClassrooms?: number;
  totalHalaqas?: number;
  presentToday?: number;
  feesCollected?: number;
  unpaidFees?: number;
}

export interface Apprenant {
  id: number;
  nom: string;
  prenom: string;
  date_naissance?: string | null;
  sexe?: string | null;
  niveau?: string | null;
  telephone_parent?: string | null;
  nom_parent?: string | null;
  adresse?: string | null;
  numero_matricule?: string | null;
  numero_h?: string | null;
  parent_numero_h?: string | null;
  photo_url?: string | null;
  is_active?: boolean;
  statut?: string;
  created_at?: string;
  /** Classe de l'élève (école) */
  classroom_id?: number | null;
  classe?: string | null;
}

export interface MembreEquipe {
  id: number;
  nom: string;
  prenom: string;
  role: string;
  specialite?: string | null;
  matieres?: string[];
  telephone?: string | null;
  email?: string | null;
  matricule?: string | null;
  numero_h?: string | null;
  photo_url?: string | null;
  is_active?: boolean;
  /** Présenté sur le site de l'école */
  sur_site?: boolean;
  /** Accès à la gestion interne : « aucun », « lecture »… */
  acces_gestion?: string;
  profil?: string | null;
  created_at?: string;
}

/** Créneau de l'emploi du temps d'une classe ou d'une halaqa */
export interface Creneau {
  jour: string;
  heure_debut: string;
  heure_fin: string;
  matiere: string;
  enseignant_id?: number | string | null;
}

/** Classe (école) ou halaqa (madrasa) */
export interface Groupe {
  id: number;
  nom: string;
  niveau: string;
  capacite?: number;
  enseignant_id?: Nombre | null;
  professeur_principal_id?: number | null;
  // Repris par la liste des classes (école)
  professeur_id?: Nombre | null;
  prof_nom?: string | null;
  prof_prenom?: string | null;
  nb_eleves?: number;
  student_count?: number;
  emploi_du_temps?: Creneau[];
  photo_url?: string | null;
  created_at?: string;
  /** Tous les enseignants de la classe (école) — le professeur principal en fait partie */
  enseignants?: { id: number; prenom?: string; nom?: string; photo_url?: string | null; specialite?: string | null }[];
}

/** Présence d'un apprenant pour la journée choisie */
export interface LignePresence {
  student_id: number;
  prenom: string;
  nom: string;
  statut: string;
}

export interface PresenceEnregistree {
  id?: number;
  student_id: number;
  date_presence?: string;
  statut: string;
}

// Champs repris de l'apprenant par les listes (notes, frais, bulletins)
interface AvecApprenant {
  /** Texte quand il vient d'être choisi dans un formulaire */
  student_id: Nombre;
  student_nom?: string | null;
  student_prenom?: string | null;
  numero_matricule?: string | null;
  telephone_parent?: string | null;
}

/** Bilan des présences d'un apprenant (historique) */
export interface ResumePresence {
  student_id: number;
  nom: string;
  prenom: string;
  presences: Nombre;
  absences: Nombre;
  total: Nombre;
}

export interface Note extends AvecApprenant {
  id: number;
  matiere: string;
  note: Nombre;
  note_max: Nombre;
  periode: string;
  sourate?: string | null;
  commentaire?: string | null;
  created_at?: string;
}

export interface Frais extends AvecApprenant {
  id: number;
  type_frais: string;
  montant: Nombre;
  montant_paye?: Nombre | null;
  periode?: string | null;
  echeance?: string | null;
  est_paye: boolean;
  date_paiement?: string | null;
  created_at?: string;
}

export interface Bulletin extends AvecApprenant {
  id: number;
  /** Nom de la classe (école) */
  classe?: string | null;
  niveau?: string | null;
  periode: string;
  annee_scolaire: string;
  moyenne_generale: Nombre;
  rang?: number | null;
  effectif?: number | null;
  mention?: string | null;
  appreciation?: string | null;
  is_published: boolean;
  published_at?: string | null;
  created_at?: string;
}

export interface DemandeInscription {
  id: number;
  nom_enfant: string;
  date_naissance?: string | null;
  niveau_souhaite?: string | null;
  nom_parent: string;
  telephone_parent: string;
  statut: string;
  created_at: string;
}

export interface AvisEnseignement {
  id: number;
  nom_auteur?: string | null;
  numero_h?: string | null;
  note: number;
  commentaire?: string | null;
  statut: string;
  created_at: string;
}

/** Parent (ou autre membre) relié à l'école, avec les enfants qu'il suit */
export interface MembreEcole {
  id: number;
  numero_h: string;
  role: string;
  nom_display?: string | null;
  is_active?: boolean;
  prenom?: string | null;
  nom?: string | null;
  telephone_compte?: string | null;
  enfants?: { id: number; prenom?: string; nom?: string; numero_matricule?: string | null; photo_url?: string | null; classe?: string | null }[];
  photo?: string | null;
}

export interface ParametresEnseignement {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  description?: string;
  horaires?: string;
  phone_urgence?: string;
  logo_url?: string | null;
}

/** Formulaire commun des fenêtres d'ajout (apprenant, enseignant, classe, note, frais, bulletin). */
export interface FormEnseignement {
  id?: number;
  nom?: string;
  prenom?: string;
  date_naissance?: string;
  sexe?: string;
  niveau?: string;
  telephone?: string;
  telephone_parent?: string;
  nom_parent?: string;
  parent_numero_h?: string;
  email?: string;
  numero_h?: string;
  role?: string;
  matiere?: string;
  specialite?: string;
  profil?: string;
  sur_site?: boolean;
  acces_gestion?: string;
  photo_url?: string | null;
  capacite?: Nombre;
  enseignant_id?: Nombre;
  /** Enseignants d'une classe (école) */
  enseignants?: number[];
  numero_matricule?: string | null;
  classroom_id?: Nombre | null;
  /** Matricules des enfants, en ajoutant un parent */
  matricules?: string;
  emploi_du_temps?: Creneau[];
  student_id?: Nombre;
  periode?: string;
  note?: Nombre;
  note_max?: Nombre;
  sourate?: string;
  commentaire?: string;
  type_frais?: string;
  montant?: Nombre;
  echeance?: string;
  annee?: string;
  publish?: boolean;
}

/** Champ texte du formulaire, utilisé par les listes de champs « Libellé|champ|type » */
export type ChampTexte = {
  [K in keyof FormEnseignement]-?: NonNullable<FormEnseignement[K]> extends string ? K : never
}[keyof FormEnseignement];

/** Réponse du serveur : chaque route remplit la clé qui la concerne. */
export interface ReponseEnseignement {
  success?: boolean;
  message?: string;
  tenant?: EtablissementEnseignement;
  students?: Apprenant[];
  student?: Apprenant;
  staff?: MembreEquipe[];
  attendance?: PresenceEnregistree[];
  grades?: Note[];
  grade?: Note;
  fees?: Frais[];
  fee?: Frais;
  bulletins?: Bulletin[];
  requests?: DemandeInscription[];
  reviews?: AvisEnseignement[];
  members?: MembreEcole[];
  user?: { prenom: string; nom: string };
  summary?: ResumePresence[];
  /** Nombre de bulletins générés */
  generated?: number;
  classrooms?: Groupe[];
  halaqas?: Groupe[];
  /** Classe ou halaqa qui vient d'être créée */
  classroom?: Groupe;
  halaqa?: Groupe;
}

export interface ReponseAjoutEquipe { success?: boolean; message?: string; staff?: MembreEquipe }

/** Ce que voit un parent (/my-access) : ses enfants et le suivi de l'enfant choisi */
export interface SuiviParent {
  success?: boolean;
  status?: string;
  role?: string;
  tenant?: { name: string; logo_url?: string | null; address?: string | null; phone?: string | null };
  children?: { id: number; prenom: string; nom: string }[];
  student?: (Apprenant & { classe?: string | null }) | null;
  grades?: Note[];
  attendance?: (PresenceEnregistree & { est_present?: boolean })[];
  fees?: Frais[];
  bulletins?: Bulletin[];
}
