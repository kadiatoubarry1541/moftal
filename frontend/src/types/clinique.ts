// Données de la gestion interne d'une clinique, telles que le serveur les renvoie
// (backend/src/routes/clinic-management.js). Les montants NUMERIC arrivent souvent
// en texte depuis PostgreSQL : on les lit toujours avec Number(…) ou +….

export type Montant = number | string;

export interface EtablissementClinique {
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
}

export interface StatsClinique {
  patients?: number;
  staff?: number;
  appointmentsToday?: number;
  appointmentsPending?: number;
  revenueMonth?: number;
  revenueToday?: number;
  patientsToday?: number;
  urgences?: number;
}

export interface StatsPharmacie {
  pending?: number;
  dispensedToday?: number;
  rupture?: number;
  totalStock?: number;
  expiringSoon?: number;
}

// Champs ajoutés par les jointures : patient (p_…) et membre du personnel (s_…)
interface AvecPatient { patient_id?: number | null; p_nom?: string; p_prenom?: string; p_tel?: string; p_matricule?: string }
interface AvecPersonnel { staff_id?: number | null; s_nom?: string; s_prenom?: string }

export interface Patient {
  id: number;
  nom: string;
  prenom: string;
  date_naissance?: string | null;
  sexe?: string | null;
  telephone?: string | null;
  adresse?: string | null;
  numero_matricule?: string | null;
  numero_h?: string | null;
  groupe_sanguin?: string | null;
  allergies?: string | null;
  solde_du?: Montant;
  created_at?: string;
  /** Photo du patient (facultative), montrée sur sa carte */
  photo_url?: string | null;
}

export interface Personnel {
  id: number;
  nom: string;
  prenom: string;
  role: string;
  service?: string | null;
  specialite?: string | null;
  telephone?: string | null;
  email?: string | null;
  matricule?: string | null;
  numero_h?: string | null;
  is_active?: boolean;
  created_at?: string;
}

export interface RendezVous extends AvecPatient, AvecPersonnel {
  id: number;
  service?: string | null;
  date_rdv: string;
  heure?: string | null;
  statut: string;
  motif?: string | null;
  notes?: string | null;
  created_at?: string;
}

/** Médicament d'une ordonnance (les plus anciennes ordonnances en gardent juste le nom). */
export type MedicamentPrescrit = string | { medicament?: string; quantite?: number; stock_id?: number | null };

export function nomMedicament(m: MedicamentPrescrit | null | undefined): string {
  if (!m) return "";
  return typeof m === "string" ? m : m.medicament || "";
}

export interface Ordonnance extends AvecPatient, AvecPersonnel {
  id: number;
  date_prescription?: string;
  medicaments: MedicamentPrescrit[];
  diagnostic?: string | null;
  notes?: string | null;
  numero_ordo?: string | null;
  pharma_statut?: string | null;
  created_at?: string;
}

export interface Consultation extends AvecPatient, AvecPersonnel {
  id: number;
  date_visite?: string;
  type_consultation?: string | null;
  diagnostic?: string | null;
  traitement?: string | null;
  poids?: Montant | null;
  tension?: string | null;
  temperature?: Montant | null;
  created_at?: string;
}

export interface Examen extends AvecPatient, AvecPersonnel {
  id: number;
  categorie: string;
  type_examen?: string | null;
  resultat?: string | null;
  fichier?: string | null;
  statut: string;
  date_prescription: string;
  date_resultat?: string | null;
  created_at?: string;
}

export interface Vaccination extends AvecPatient, AvecPersonnel {
  id: number;
  vaccin: string;
  dose?: string | null;
  date_administration: string;
  prochain_rappel?: string | null;
  notes?: string | null;
  created_at?: string;
}

export interface Lit {
  id: number;
  numero: string;
  type_chambre: string;
  statut: string;
  created_at?: string;
}

export interface Admission extends AvecPatient, AvecPersonnel {
  id: number;
  bed_id?: number | null;
  bed_numero?: string | null;
  motif_admission?: string | null;
  date_admission: string;
  date_sortie?: string | null;
  statut: string;
  notes_sortie?: string | null;
  created_at?: string;
}

export interface AvisPatient {
  id: number;
  nom_patient?: string | null;
  numero_h?: string | null;
  note: number;
  commentaire?: string | null;
  statut: string;
  created_at: string;
}

export interface Paiement extends AvecPatient {
  id: number;
  montant: Montant;
  motif?: string | null;
  date_paiement?: string;
  mode_paiement?: string;
  recu_numero?: string | null;
  created_at?: string;
}

export interface LigneFacture {
  description: string;
  quantite: number | string;
  prix_unitaire: number | string;
}

export interface Facture extends AvecPatient, AvecPersonnel {
  id: number;
  numero_facture?: string | null;
  lignes: LigneFacture[];
  sous_total: Montant;
  remise: Montant;
  total: Montant;
  montant_paye?: Montant;
  statut: string;
  mode_paiement: string;
  notes?: string | null;
  date_facture: string;
  created_at?: string;
}

export interface StockMedicament {
  id: number;
  nom: string;
  forme: string;
  dosage?: string | null;
  quantite: number;
  quantite_min: number;
  prix_unitaire: Montant;
  date_expiration?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Dispensation extends AvecPatient, AvecPersonnel {
  id: number;
  prescription_id?: number | null;
  medicaments_dispensed: MedicamentPrescrit[];
  notes?: string | null;
  dispense_at: string;
  // Repris de l'ordonnance
  numero_ordo?: string | null;
  diagnostic?: string | null;
}

export interface DemandeRendezVous {
  id: number;
  nom: string;
  telephone: string;
  service?: string | null;
  date_souhaitee?: string | null;
  motif?: string | null;
  statut: string;
  created_at: string;
}

/** Formulaire commun des fenêtres d'ajout (patient, rendez-vous, facture…). */
export interface FormClinique {
  id?: number;
  photo_url?: string | null;
  nom?: string;
  prenom?: string;
  date_naissance?: string;
  sexe?: string;
  telephone?: string;
  adresse?: string;
  email?: string;
  groupe_sanguin?: string;
  allergies?: string;
  numero_h?: string;
  role?: string;
  service?: string;
  specialite?: string;
  patient_id?: number | string;
  staff_id?: number | string;
  bed_id?: number | string;
  date_rdv?: string;
  heure?: string;
  motif?: string;
  motif_admission?: string;
  notes?: string;
  statut?: string;
  diagnostic?: string;
  traitement?: string;
  medicaments_text?: string;
  type_consultation?: string;
  poids?: number | string;
  tension?: string;
  temperature?: number | string;
  categorie?: string;
  type_examen?: string;
  resultat?: string;
  fichier?: string;
  date_prescription?: string;
  date_resultat?: string;
  vaccin?: string;
  dose?: string;
  date_administration?: string;
  prochain_rappel?: string;
  numero?: string;
  type_chambre?: string;
  montant?: number | string;
  mode_paiement?: string;
  forme?: string;
  dosage?: string;
  quantite?: number | string;
  quantite_min?: number | string;
  prix_unitaire?: number | string;
  date_expiration?: string;
  lignes?: LigneFacture[];
  remise?: number | string;
  date_facture?: string;
}

export interface ParametresClinique {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  description?: string;
  horaires?: string;
  phone_urgence?: string;
  logo_url?: string | null;
}

/** Réponse du serveur : chaque route remplit la clé qui la concerne
 *  (l'ajout d'un membre du personnel renvoie `staff` seul : voir ReponseAjoutPersonnel). */
export interface ReponseClinique {
  success: boolean;
  message?: string;
  conflict?: boolean;
  tenant?: EtablissementClinique;
  myRole?: string;
  stats?: StatsClinique & StatsPharmacie;
  recentPatients?: Patient[];
  patients?: Patient[];
  patient?: Patient;
  staff?: Personnel[];
  appointments?: RendezVous[];
  appointment?: RendezVous;
  requests?: DemandeRendezVous[];
  prescriptions?: Ordonnance[];
  prescription?: Ordonnance;
  records?: Consultation[];
  record?: Consultation;
  history?: Dispensation[];
  exams?: Examen[];
  exam?: Examen;
  vaccinations?: Vaccination[];
  vaccination?: Vaccination;
  beds?: Lit[];
  bed?: Lit;
  admissions?: Admission[];
  admission?: Admission;
  reviews?: AvisPatient[];
  payments?: Paiement[];
  payment?: Paiement;
  invoices?: Facture[];
  invoice?: Facture;
  stock?: StockMedicament[];
  item?: StockMedicament;
}

export interface ReponseAjoutPersonnel { success: boolean; message?: string; staff?: Personnel }
