// Données de la gestion interne « Journaliste / Média », telles que le serveur les renvoie
// (backend/src/routes/journalist-management.js). Fichier généré à partir des tables du serveur ;
// les montants DECIMAL arrivent souvent en texte : on les lit avec Number(…) ou +….

export type Montant = number | string;

export interface JournalReporter {
  id: number;
  nom: string;
  prenom?: string | null;
  telephone?: string | null;
  numero_h?: string | null;
  specialite?: string | null;
  role?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
}

export interface JournalArticle {
  id: number;
  reporter_id?: number | null;
  reporter_nom?: string | null;
  titre: string;
  contenu?: string | null;
  categorie?: string | null;
  statut?: string | null;
  date_pub?: string | null;
  created_at?: string | null;
}

export interface JournalSubscriber {
  id: number;
  nom: string;
  telephone?: string | null;
  email?: string | null;
  type_abo?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
}

export interface JournalAnnouncement {
  id: number;
  titre: string;
  contenu: string;
  type?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
}

/** Tableau de bord (/dashboard) */
export interface TableauJournal {
  success?: boolean;
  totalReporters?: number;
  totalArticles?: number;
  totalSubscribers?: number;
  totalAnnouncements?: number;
  recentArticles?: JournalArticle[];
}
