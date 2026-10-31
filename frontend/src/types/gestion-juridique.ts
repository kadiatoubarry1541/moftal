// Données de la gestion interne « Juridique », telles que le serveur les renvoie
// (backend/src/routes/juridique-management.js). Fichier généré à partir des tables du serveur ;
// les montants DECIMAL arrivent souvent en texte : on les lit avec Number(…) ou +….

export type Montant = number | string;

export interface JuridiqueService {
  id: number;
  nom: string;
  categorie?: string | null;
  prix?: Montant | null;
  duree_min?: number | null;
  description?: string | null;
  image_url?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
  video_url?: string | null;
  audio_url?: string | null;
}

export interface JuridiqueStaff {
  id: number;
  nom: string;
  prenom?: string | null;
  poste?: string | null;
  telephone?: string | null;
  specialite?: string | null;
  salaire?: Montant | null;
  is_active?: boolean | null;
  created_at?: string | null;
}

export interface JuridiqueBooking {
  id: number;
  client_nom: string;
  client_telephone?: string | null;
  service_id?: number | null;
  staff_id?: number | null;
  date_rdv: string;
  heure_rdv?: string | null;
  statut?: string | null;
  notes?: string | null;
  created_at?: string | null;
  service_nom?: string | null;
  service_prix?: Montant | null;
  staff_nom?: string | null;
}

export interface JuridiqueClient {
  id: number;
  nom: string;
  telephone?: string | null;
  email?: string | null;
  notes?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
}

export interface JuridiqueDossier {
  id: number;
  reference?: string | null;
  titre: string;
  client_nom?: string | null;
  client_telephone?: string | null;
  domaine?: string | null;
  responsable_id?: number | null;
  prochaine_etape?: string | null;
  date_echeance?: string | null;
  honoraires?: Montant | null;
  montant_paye?: Montant | null;
  statut?: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  responsable_nom?: string | null;
  responsable_prenom?: string | null;
}

export interface JuridiqueAnnouncement {
  id: number;
  titre: string;
  contenu: string;
  type?: string | null;
  created_at?: string | null;
}

/** Tableau de bord (/dashboard) */
export interface TableauJuridique {
  success?: boolean;
  totalServices?: number;
  totalStaff?: number;
  rdvAujourdhui?: number;
  rdvEnAttente?: number;
  totalClients?: number;
  dossiersOuverts?: number;
  echeancesSemaine?: number;
  recentBookings?: JuridiqueBooking[];
}
