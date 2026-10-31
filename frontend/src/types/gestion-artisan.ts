// Données de la gestion interne « Artisanat », telles que le serveur les renvoie
// (backend/src/routes/artisan-management.js). Fichier généré à partir des tables du serveur ;
// les montants DECIMAL arrivent souvent en texte : on les lit avec Number(…) ou +….

export type Montant = number | string;

export interface ArtisanService {
  id: number;
  nom: string;
  categorie?: string | null;
  prix_base?: number | null;
  description?: string | null;
  zone_intervention?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
  image_url?: string | null;
}

export interface ArtisanIntervention {
  id: number;
  client_id?: number | null;
  service_id?: number | null;
  titre: string;
  description?: string | null;
  adresse?: string | null;
  date_debut?: string | null;
  date_fin?: string | null;
  statut?: string | null;
  priorite?: string | null;
  cout_estime?: number | null;
  cout_reel?: number | null;
  notes?: string | null;
  created_at?: string | null;
  client_telephone?: string | null;
  client_nom?: string | null;
  service_nom?: string | null;
}

export interface ArtisanClient {
  id: number;
  nom: string;
  telephone?: string | null;
  adresse?: string | null;
  email?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
}

export interface ArtisanAnnouncement {
  id: number;
  titre: string;
  contenu: string;
  type?: string | null;
  created_at?: string | null;
}

/** Tableau de bord (/dashboard) */
export interface TableauArtisan {
  success?: boolean;
  totalServices?: number;
  interventionsEnCours?: number;
  enCours?: number;
  terminéesAujourdhui?: number;
  totalClients?: number;
  caCeMois?: number;
  recentInterventions?: ArtisanIntervention[];
}
