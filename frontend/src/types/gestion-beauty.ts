// Données de la gestion interne « Beauté », telles que le serveur les renvoie
// (backend/src/routes/beauty-management.js). Fichier généré à partir des tables du serveur ;
// les montants DECIMAL arrivent souvent en texte : on les lit avec Number(…) ou +….

export type Montant = number | string;

export interface BeauteService {
  id: number;
  nom: string;
  categorie?: string | null;
  prix: number;
  duree_min?: number | null;
  description?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  audio_url?: string | null;
}

export interface BeauteStaff {
  id: number;
  nom: string;
  prenom?: string | null;
  poste?: string | null;
  telephone?: string | null;
  specialite?: string | null;
  salaire?: number | null;
  is_active?: boolean | null;
  created_at?: string | null;
}

export interface BeauteBooking {
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
  service_prix?: Montant | null;
  service_nom?: string | null;
  staff_nom?: string | null;
}

export interface BeauteClient {
  id: number;
  nom: string;
  telephone?: string | null;
  email?: string | null;
  notes?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
}

export interface BeauteAnnouncement {
  id: number;
  titre: string;
  contenu: string;
  type?: string | null;
  created_at?: string | null;
}

/** Tableau de bord (/dashboard) */
export interface TableauBeaute {
  success?: boolean;
  totalServices?: number;
  totalStaff?: number;
  rdvAujourdhui?: number;
  rdvCeMois?: number;
  rdvEnAttente?: number;
  totalClients?: number;
  recentBookings?: BeauteBooking[];
}
