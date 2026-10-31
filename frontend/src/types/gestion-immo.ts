// Données de la gestion interne « Immobilier », telles que le serveur les renvoie
// (backend/src/routes/immo-management.js). Fichier généré à partir des tables du serveur ;
// les montants DECIMAL arrivent souvent en texte : on les lit avec Number(…) ou +….

export type Montant = number | string;

export interface ImmoProperty {
  id: number;
  nom: string;
  type_bien?: string | null;
  adresse?: string | null;
  ville?: string | null;
  surface?: Montant | null;
  nb_pieces?: number | null;
  loyer_mensuel?: Montant | null;
  charges?: Montant | null;
  statut?: string | null;
  description?: string | null;
  created_at?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  images?: unknown | null;
}

export interface ImmoDemande {
  id: number;
  client_nom: string;
  client_telephone: string;
  type_demande?: string | null;
  message?: string | null;
  /** Biens choisis sur le site (JSON) */
  biens: BienDemande[];
  statut?: string | null;
  created_at?: string | null;
}

export interface ImmoTenant {
  id: number;
  nom: string;
  prenom?: string | null;
  telephone?: string | null;
  email?: string | null;
  cni?: string | null;
  property_id?: number | null;
  date_entree?: string | null;
  loyer?: Montant | null;
  caution?: Montant | null;
  created_at?: string | null;
  property_nom?: string | null;
}

export interface ImmoPayment {
  id: number;
  tenant_id?: number | null;
  property_id?: number | null;
  montant?: Montant | null;
  mois_concerne?: string | null;
  type_paiement?: string | null;
  statut?: string | null;
  notes?: string | null;
  date_paiement?: string | null;
  created_at?: string | null;
  locataire_prenom?: string | null;
  property_nom?: string | null;
  locataire_tel?: string | null;
  locataire_nom?: string | null;
}

export interface ImmoMaintenance {
  id: number;
  property_id?: number | null;
  titre: string;
  description?: string | null;
  type_intervention?: string | null;
  priorite?: string | null;
  cout_estime?: Montant | null;
  statut?: string | null;
  created_at?: string | null;
  property_nom?: string | null;
}

export interface ImmoAnnouncement {
  id: number;
  titre: string;
  contenu: string;
  type?: string | null;
  created_at?: string | null;
}

/** Tableau de bord (/dashboard) */
export interface TableauImmo {
  success?: boolean;
  totalProperties?: number;
  propertiesVacantes?: number;
  loyersMois?: number;
  loyersOccupes?: number;
  loyersNonPayes?: number;
  loyersNonPayesMontant?: number;
  maintenanceEnCours?: number;
  totalAnnouncements?: number;
  recentPayments?: ImmoPayment[];
}

/** Bien choisi dans une demande faite depuis le site (colonne biens, en JSON) */
export interface BienDemande {
  id?: number;
  nom: string;
  prix?: Montant | null;
}
