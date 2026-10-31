// Données de la gestion interne « Réseau / Association », telles que le serveur les renvoie
// (backend/src/routes/reseau-management.js). Fichier généré à partir des tables du serveur ;
// les montants DECIMAL arrivent souvent en texte : on les lit avec Number(…) ou +….

export type Montant = number | string;

export interface ReseauMember {
  id: number;
  nom: string;
  prenom?: string | null;
  telephone?: string | null;
  email?: string | null;
  numero_h?: string | null;
  role?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
}

export interface ReseauProjet {
  id: number;
  titre: string;
  description?: string | null;
  statut?: string | null;
  responsable?: string | null;
  date_debut?: string | null;
  date_fin?: string | null;
  created_at?: string | null;
}

export interface ReseauCotisation {
  id: number;
  membre_nom?: string | null;
  montant?: Montant | null;
  type_cot?: string | null;
  periode?: string | null;
  est_paye?: boolean | null;
  date_paiement?: string | null;
  created_at?: string | null;
}

export interface ReseauAnnouncement {
  id: number;
  titre: string;
  contenu: string;
  type?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
}

/** Tableau de bord (/dashboard) */
export interface TableauReseau {
  success?: boolean;
  totalMembers?: number;
  totalAnnouncements?: number;
  projetsEnCours?: number;
  cotisationsAnnee?: number;
  recentAnnouncements?: ReseauAnnouncement[];
}
