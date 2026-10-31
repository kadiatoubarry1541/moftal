// Données de la gestion interne « ONG », telles que le serveur les renvoie
// (backend/src/routes/ngo-management.js). Fichier généré à partir des tables du serveur ;
// les montants DECIMAL arrivent souvent en texte : on les lit avec Number(…) ou +….

export type Montant = number | string;

export interface OngMember {
  id: number;
  nom: string;
  prenom?: string | null;
  telephone?: string | null;
  numero_h?: string | null;
  role?: string | null;
  competence?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
}

export interface OngProject {
  id: number;
  titre: string;
  description?: string | null;
  statut?: string | null;
  date_debut?: string | null;
  date_fin?: string | null;
  budget?: Montant | null;
  created_at?: string | null;
}

export interface OngDonation {
  id: number;
  donateur_nom?: string | null;
  montant: Montant;
  type_don?: string | null;
  projet_id?: number | null;
  projet_titre?: string | null;
  date_don?: string | null;
  created_at?: string | null;
}

export interface OngAnnouncement {
  id: number;
  titre: string;
  contenu: string;
  type?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
}

/** Tableau de bord (/dashboard) */
export interface TableauOng {
  success?: boolean;
  totalMembers?: number;
  projetsEnCours?: number;
  donsMois?: number;
  totalAnnouncements?: number;
  recentProjects?: OngProject[];
}
