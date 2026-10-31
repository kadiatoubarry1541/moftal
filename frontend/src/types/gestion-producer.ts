// Données de la gestion interne « Production », telles que le serveur les renvoie
// (backend/src/routes/producer-management.js). Fichier généré à partir des tables du serveur ;
// les montants DECIMAL arrivent souvent en texte : on les lit avec Number(…) ou +….

export type Montant = number | string;

export interface ProductionProduct {
  id: number;
  nom: string;
  categorie?: string | null;
  unite?: string | null;
  prix_unitaire?: number | null;
  stock?: number | null;
  description?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
  image_url?: string | null;
}

export interface ProductionLot {
  id: number;
  product_id?: number | null;
  quantite_prevue: Montant;
  quantite_produite?: Montant | null;
  date_debut?: string | null;
  date_fin_prevue?: string | null;
  date_fin_reelle?: string | null;
  statut?: string | null;
  notes?: string | null;
  created_at?: string | null;
  produit_nom?: string | null;
}

export interface ProductionOrder {
  id: number;
  client_nom: string;
  client_telephone?: string | null;
  product_id?: number | null;
  quantite: Montant;
  montant_total?: number | null;
  statut?: string | null;
  date_livraison_prevue?: string | null;
  date_livraison?: string | null;
  notes?: string | null;
  created_at?: string | null;
  produit_nom?: string | null;
}

export interface ProductionStaff {
  id: number;
  nom: string;
  prenom?: string | null;
  poste?: string | null;
  telephone?: string | null;
  salaire?: number | null;
  is_active?: boolean | null;
  created_at?: string | null;
}

export interface ProductionAnnouncement {
  id: number;
  titre: string;
  contenu: string;
  type?: string | null;
  created_at?: string | null;
}

/** Tableau de bord (/dashboard) */
export interface TableauProduction {
  success?: boolean;
  totalProducts?: number;
  lotsEnCours?: number;
  commandesEnAttente?: number;
  totalStaff?: number;
  caCeMois?: number;
  recentOrders?: ProductionOrder[];
}
