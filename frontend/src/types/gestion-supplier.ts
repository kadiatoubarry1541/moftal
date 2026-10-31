// Données de la gestion interne « Fournisseur », telles que le serveur les renvoie
// (backend/src/routes/supplier-management.js). Fichier généré à partir des tables du serveur ;
// les montants DECIMAL arrivent souvent en texte : on les lit avec Number(…) ou +….

export type Montant = number | string;

export interface FournisseurProduct {
  id: number;
  nom: string;
  categorie?: string | null;
  prix_gros?: Montant | null;
  prix_detail?: Montant | null;
  stock?: number | null;
  unite?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  audio_url?: string | null;
}

export interface FournisseurClient {
  id: number;
  nom: string;
  telephone?: string | null;
  adresse?: string | null;
  type_client?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
}

export interface FournisseurOrder {
  id: number;
  client_nom?: string | null;
  client_id?: number | null;
  montant_total?: Montant | null;
  statut?: string | null;
  date_commande?: string | null;
  notes?: string | null;
  created_at?: string | null;
}

export interface FournisseurAnnouncement {
  id: number;
  titre: string;
  contenu: string;
  type?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
}

/** Tableau de bord (/dashboard) */
export interface TableauFournisseur {
  success?: boolean;
  totalProducts?: number;
  totalClients?: number;
  commandesEnAttente?: number;
  caMois?: number;
  recentOrders?: FournisseurOrder[];
}
