// Données de la gestion interne d'une boutique (commerce ou vendeur), telles que le
// serveur les renvoie (backend/src/routes/commerce-management.js, tables commerce_*).
// Les montants DECIMAL arrivent souvent en texte : on les lit avec Number(…) ou +….

export type Montant = number | string;

export interface EtablissementCommerce {
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

export interface Produit {
  id: number;
  nom: string;
  categorie?: string | null;
  prix_vente: Montant;
  prix_achat?: Montant | null;
  stock: number;
  stock_min: number;
  unite?: string | null;
  code_barre?: string | null;
  photo_url?: string | null;
  is_active?: boolean;
  created_at?: string;
  video_url?: string | null;
  audio_url?: string | null;
}

/** Article d'une vente */
export interface ArticleVente {
  nom: string;
  product_id?: number | string | null;
  prix_unitaire: Montant;
  quantite: Montant;
}

export interface Vente {
  id: number;
  client_nom?: string | null;
  total: Montant;
  remise?: Montant | null;
  montant_recu?: Montant | null;
  type_paiement: string;
  est_credit: boolean;
  annulee?: boolean;
  notes?: string | null;
  items: ArticleVente[];
  date_vente: string;
  created_at?: string;
}

export interface Client {
  id: number;
  nom: string;
  telephone?: string | null;
  adresse?: string | null;
  credit_total: Montant;
  is_active?: boolean;
  created_at?: string;
}

export interface Depense {
  id: number;
  description: string;
  montant: Montant;
  categorie?: string | null;
  date_depense: string;
}

export interface EmployeCommerce {
  id: number;
  nom: string;
  telephone?: string | null;
  role: string;
  numero_h?: string | null;
  photo_url?: string | null;
  is_active?: boolean;
  created_at?: string;
}

export interface MouvementStock {
  id: number;
  product_id: number;
  delta: number;
  reason?: string | null;
  created_at: string;
}

export interface Fournisseur {
  id: number;
  nom: string;
  telephone?: string | null;
  adresse?: string | null;
  is_active?: boolean;
  created_at?: string;
}

export interface Achat {
  id: number;
  supplier_id: number;
  product_id: number;
  quantite: number;
  prix_unitaire: Montant;
  total: Montant;
  created_at: string;
  // Repris par la liste des achats
  supplier_nom?: string | null;
  product_nom?: string | null;
}

export interface AvisCommerce {
  id: number;
  nom_auteur?: string | null;
  note: number;
  commentaire?: string | null;
  statut: string;
  created_at: string;
}

/** Tableau de bord (/dashboard) */
export interface TableauCommerce {
  success?: boolean;
  totalProducts?: number;
  alertesStock?: number;
  ventesAujourdhui?: number;
  caAujourdhui?: number;
  caMois?: number;
  totalCredits?: number;
  totalClients?: number;
  depensesAujourdhui?: number;
  recentSales?: Vente[];
  lowStockProducts?: Produit[];
}

/** Formulaire d'un produit : les nombres restent en texte tant qu'on les tape */
export interface FormProduit {
  id?: number;
  nom: string;
  categorie: string;
  prix_vente: Montant;
  prix_achat: Montant;
  stock: Montant;
  stock_min: Montant;
  unite: string;
  code_barre: string;
  photo_url: string;
}

export interface ParametresCommerce {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  description?: string;
  horaires?: string;
  phone_urgence?: string;
  logo_url?: string | null;
}

/** Réponse du serveur : chaque route remplit la clé qui la concerne. */
export interface ReponseCommerce {
  success?: boolean;
  message?: string;
  tenant?: EtablissementCommerce;
  myRole?: string;
  products?: Produit[];
  product?: Produit;
  sales?: Vente[];
  sale?: Vente;
  clients?: Client[];
  client?: Client;
  expenses?: Depense[];
  expense?: Depense;
  staff?: EmployeCommerce[];
  member?: EmployeCommerce;
  movements?: MouvementStock[];
  suppliers?: Fournisseur[];
  supplier?: Fournisseur;
  purchases?: Achat[];
  purchase?: Achat;
  reviews?: AvisCommerce[];
  newStock?: number;
  count?: number;
  montant?: Montant;
}
