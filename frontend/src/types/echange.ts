// Place de marché « Échanges » : coordonnées des vendeurs et fournisseurs.

export interface ContactEchange {
  phone?: string;
  email?: string;
  website?: string;
}

export interface AdresseEchange {
  street?: string;
  city?: string;
  region?: string;
  country?: string;
}

/** Commande passée sur une publication de l'Échange (table exchange_orders) */
export interface CommandeEchange {
  id: number;
  product_id?: string | null;
  product_title: string;
  category?: string | null;
  unit_price: number | string;
  currency: string;
  quantite: number;
  total: number | string;
  seller_numero_h: string;
  /** Nom du vendeur, repris de son compte */
  seller_nom?: string | null;
  buyer_numero_h: string;
  buyer_nom?: string | null;
  buyer_telephone: string;
  adresse?: string | null;
  message?: string | null;
  statut: string;
  created_at: string;
  updated_at?: string;
}
