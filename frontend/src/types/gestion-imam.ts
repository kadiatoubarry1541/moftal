// Données de la gestion interne « Réseau Imam », telles que le serveur les renvoie
// (backend/src/routes/imam-management.js). Fichier généré à partir des tables du serveur ;
// les montants DECIMAL arrivent souvent en texte : on les lit avec Number(…) ou +….

export type Montant = number | string;

export interface ImamImam {
  id: number;
  nom: string;
  prenom?: string | null;
  telephone?: string | null;
  numero_h?: string | null;
  specialite?: string | null;
  mosquee?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
}

export interface ImamPredication {
  id: number;
  imam_id?: number | null;
  imam_nom?: string | null;
  titre: string;
  type_pred?: string | null;
  date_pred?: string | null;
  mosquee?: string | null;
  notes?: string | null;
  created_at?: string | null;
}

export interface ImamMosque {
  id: number;
  nom: string;
  adresse?: string | null;
  responsable?: string | null;
  telephone?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
}

export interface ImamAnnouncement {
  id: number;
  titre: string;
  contenu: string;
  type?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
}

export interface ImamMember {
  id: number;
  nom: string;
  prenom?: string | null;
  telephone?: string | null;
  numero_h?: string | null;
  role?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
}

export interface ImamDonation {
  id: number;
  donateur_nom?: string | null;
  montant: Montant;
  type_don?: string | null;
  date_don?: string | null;
  created_at?: string | null;
}

export interface ImamQuranStudent {
  id: number;
  nom: string;
  prenom?: string | null;
  niveau_coran?: string | null;
  telephone_parent?: string | null;
  statut?: string | null;
  created_at?: string | null;
}

/** Tableau de bord (/dashboard) */
export interface TableauImam {
  success?: boolean;
  totalImams?: number;
  predsMois?: number;
  totalMosques?: number;
  totalAnnouncements?: number;
  totalMembers?: number;
  donsMois?: number;
  quranStudents?: number;
  recentPredications?: ImamPredication[];
}
