// Données de la gestion interne « Vendeur », telles que le serveur les renvoie
// (backend/src/routes/retailer-management.js). Fichier généré à partir des tables du serveur ;
// les montants DECIMAL arrivent souvent en texte : on les lit avec Number(…) ou +….

export type Montant = number | string;

export interface VendeurProduct {
  id: number;
  nom: string;
  categorie?: string | null;
  prix_vente: number;
  prix_achat?: number | null;
  stock?: number | null;
  stock_min?: number | null;
  unite?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  audio_url?: string | null;
}

export interface VendeurSale {
  id: number;
  client_nom?: string | null;
  type_paiement?: string | null;
  total: number;
  est_credit?: boolean | null;
  notes?: string | null;
  date_vente?: string | null;
  /** Articles de la vente, regroupés par le serveur */
  items?: VendeurSaleItem[] | null;
  nom?: string | null;
  quantite?: Montant | null;
  prix_unitaire?: number | null;
}

export interface VendeurClient {
  id: number;
  nom: string;
  telephone?: string | null;
  adresse?: string | null;
  credit_total?: number | null;
  is_active?: boolean | null;
  created_at?: string | null;
}

export interface VendeurExpense {
  id: number;
  description: string;
  montant: number;
  categorie?: string | null;
  date_depense?: string | null;
}

/** Tableau de bord (/dashboard) */
export interface TableauVendeur {
  success?: boolean;
  totalProducts?: number;
  alertesStock?: number;
  ventesAujourdhui?: number;
  caAujourdhui?: number;
  caMois?: number;
  totalCredits?: number;
  totalClients?: number;
  depensesAujourdhui?: number;
  recentSales?: VendeurSale[];
  lowStockProducts?: number;
}

/** Article d'une vente (table retailer_sale_items) */
export interface VendeurSaleItem {
  id: number;
  sale_id: number;
  nom: string;
  product_id?: number | null;
  prix_unitaire: number;
  quantite?: Montant | null;
  sous_total?: number | null;
}
