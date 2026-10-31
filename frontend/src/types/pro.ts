// Comptes professionnels et établissements, communs à plusieurs écrans
// (Gestion Interne, Espace Pro, administration, vitrines).

export type PlanType = "visibility" | "full" | null;
export type StatutAbonnement = "never_paid" | "active" | "overdue" | "blocked";

/** Compte professionnel (/api/professionals/…) */
export interface CompteProfessionnel {
  id: string;
  type: string;
  name: string;
  status?: string;
  photo?: string | null;
  description?: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  services?: string[];
  specialties?: string[];
  ownerNumeroH?: string;
  subSector?: string | null;
  subscriptionStatus?: StatutAbonnement;
  subscriptionValidUntil?: string | null;
  isTrial?: boolean;
  /** "visibility" = Visibilité + Rendez-vous ; "full" (ou vide) = Gestion Interne */
  planType?: PlanType;
  hasGestionInterne?: boolean;
  gestionInterneValidUntil?: string | null;
  tenant_code?: string | null;
  created_at?: string;
}

/** Gestion interne d'un établissement (table management_tenants) */
export interface TenantGestion {
  id?: number;
  tenant_code: string;
  type: string;
  name: string;
  logo_url?: string | null;
  /** Photo du compte professionnel lié (liste admin) */
  photo?: string | null;
  owner_numero_h?: string;
  /** Identifiant (UUID) du compte professionnel lié, repris par la liste admin */
  professional_account_id?: string | null;
  // Repris du compte professionnel par la liste admin
  description?: string | null;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  is_active?: boolean;
  activated_at?: string;
  created_at?: string;
}

/** Accès à la Gestion Interne (/api/payment/acces-gestion-interne) */
export interface AccesGestionInterne {
  success?: boolean;
  aAcces?: boolean;
  mode?: string;
  message?: string;
  joursRestants?: number;
  proId?: string;
  prixMois?: number;
  prixTroisMois?: number;
  prixAn?: number;
  prixVie?: number;
}

/** Publication de la vitrine d'un professionnel (table pro_publications) */
export interface PublicationPro {
  id: string;
  professional_account_id?: string;
  type: string;
  titre: string;
  contenu?: string | null;
  image?: string | null;
  video?: string | null;
  prix?: string | null;
  disponible?: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

/** Coordonnées affichées sur le profil public, reprises pour la fenêtre « Profil » */
export interface ProfilAffiche {
  name?: string;
  description?: string | null;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  photo?: string | null;
}

/** Établissement vu depuis sa gestion interne (/info) */
export interface EtablissementGestion {
  tenant_code: string;
  name: string;
  type?: string;
  owner_numero_h?: string;
  is_active?: boolean;
  logo_url?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  description?: string | null;
  horaires?: string | null;
  phone_urgence?: string | null;
}

/** Réponse du serveur à un envoi : succès ou message d'erreur, et la fiche créée sous sa clé */
export interface ReponseServeur {
  success?: boolean;
  message?: string;
  [cle: string]: unknown;
}
