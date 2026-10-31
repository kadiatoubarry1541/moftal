// Données de la gestion interne « Mosquée », telles que le serveur les renvoie
// (backend/src/routes/mosque-management.js). Fichier généré à partir des tables du serveur ;
// les montants DECIMAL arrivent souvent en texte : on les lit avec Number(…) ou +….

export type Montant = number | string;

export interface MosqueeMember {
  id: number;
  nom: string;
  prenom?: string | null;
  telephone?: string | null;
  numero_h?: string | null;
  role?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
}

export interface MosqueeAnnouncement {
  id: number;
  titre: string;
  contenu: string;
  type?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
}

export interface MosqueeDonation {
  id: number;
  donateur_nom?: string | null;
  montant: Montant;
  type_don?: string | null;
  date_don?: string | null;
  created_at?: string | null;
}

export interface MosqueeQuranStudent {
  id: number;
  nom: string;
  prenom?: string | null;
  niveau_coran?: string | null;
  telephone_parent?: string | null;
  enseignant_id?: number | null;
  statut?: string | null;
  created_at?: string | null;
  enseignant_nom?: string | null;
}

export interface MosqueeImam {
  id: number;
  rang: number;
  nom: string;
  prenom?: string | null;
  telephone?: string | null;
  numero_h?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
}

export interface MosqueePredication {
  id: number;
  titre: string;
  type?: string | null;
  contenu?: string | null;
  sourate?: string | null;
  date_pred?: string | null;
  created_at?: string | null;
}

export interface MosqueePartenaire {
  id: number;
  nom_mosquee: string;
  ville?: string | null;
  imam_nom?: string | null;
  telephone?: string | null;
  created_at?: string | null;
}

/** Tableau de bord (/dashboard) */
export interface TableauMosquee {
  success?: boolean;
  totalMembers?: number;
  totalAnnouncements?: number;
  donsMois?: number;
  quranStudents?: number;
  recentAnnouncements?: MosqueeAnnouncement[];
}
