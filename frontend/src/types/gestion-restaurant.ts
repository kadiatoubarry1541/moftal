// Données de la gestion interne « Restaurant », telles que le serveur les renvoie
// (backend/src/routes/restaurant-management.js). Fichier généré à partir des tables du serveur ;
// les montants DECIMAL arrivent souvent en texte : on les lit avec Number(…) ou +….

export type Montant = number | string;

export interface RestaurantDish {
  id: number;
  nom: string;
  categorie?: string | null;
  prix?: Montant | null;
  description?: string | null;
  disponible?: boolean | null;
  created_at?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  audio_url?: string | null;
}

export interface RestaurantTable {
  id: number;
  numero: string;
  capacite?: number | null;
  zone?: string | null;
  statut?: string | null;
  created_at?: string | null;
}

export interface RestaurantOrder {
  id: number;
  table_id?: number | null;
  table_num?: string | null;
  /** Plats commandés : JSON (texte ou déjà lu) */
  items?: string | ArticleCommande[] | null;
  total?: Montant | null;
  type_service?: string | null;
  type_paiement?: string | null;
  notes?: string | null;
  statut?: string | null;
  created_at?: string | null;
  client_nom?: string | null;
  client_telephone?: string | null;
  adresse_livraison?: string | null;
  source?: string | null;
}

export interface RestaurantStaff {
  id: number;
  nom: string;
  prenom?: string | null;
  poste?: string | null;
  telephone?: string | null;
  salaire?: Montant | null;
  actif?: boolean | null;
  created_at?: string | null;
}

export interface RestaurantAnnouncement {
  id: number;
  titre: string;
  contenu: string;
  type?: string | null;
  created_at?: string | null;
}

/** Tableau de bord (/dashboard) */
export interface TableauRestaurant {
  success?: boolean;
  totalDishes?: number;
  ordersToday?: number;
  caToday?: number;
  caMonth?: number;
  totalTables?: number;
  totalStaff?: number;
  recentOrders?: RestaurantOrder[];
}

/** Plat d'une commande (colonne items, en JSON) */
export interface ArticleCommande {
  nom: string;
  quantite?: number;
  prix?: Montant;
}
