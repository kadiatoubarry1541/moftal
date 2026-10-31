// Données de la gestion interne « Scientifiques », telles que le serveur les renvoie
// (backend/src/routes/scientist-management.js). Fichier généré à partir des tables du serveur ;
// les montants DECIMAL arrivent souvent en texte : on les lit avec Number(…) ou +….

export type Montant = number | string;

export interface ScienceMember {
  id: number;
  nom: string;
  prenom?: string | null;
  telephone?: string | null;
  numero_h?: string | null;
  titre?: string | null;
  domaine?: string | null;
  institution?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
}

export interface SciencePublication {
  id: number;
  auteur_id?: number | null;
  auteur_nom?: string | null;
  titre: string;
  type_pub?: string | null;
  domaine?: string | null;
  statut?: string | null;
  date_pub?: string | null;
  resume?: string | null;
  created_at?: string | null;
}

export interface ScienceProject {
  id: number;
  titre: string;
  description?: string | null;
  responsable?: string | null;
  statut?: string | null;
  date_debut?: string | null;
  date_fin?: string | null;
  budget?: Montant | null;
  created_at?: string | null;
}

export interface ScienceAnnouncement {
  id: number;
  titre: string;
  contenu: string;
  type?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
}

/** Tableau de bord (/dashboard) */
export interface TableauScience {
  success?: boolean;
  totalMembers?: number;
  totalPublications?: number;
  projetsEnCours?: number;
  totalAnnouncements?: number;
  recentPublications?: SciencePublication[];
}
