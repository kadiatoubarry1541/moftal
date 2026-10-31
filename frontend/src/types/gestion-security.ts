// Données de la gestion interne « Sécurité », telles que le serveur les renvoie
// (backend/src/routes/security-management.js). Fichier généré à partir des tables du serveur ;
// les montants DECIMAL arrivent souvent en texte : on les lit avec Number(…) ou +….

export type Montant = number | string;

export interface SecuriteMgmtAgent {
  id: number;
  nom: string;
  prenom?: string | null;
  telephone?: string | null;
  numero_h?: string | null;
  grade?: string | null;
  specialite?: string | null;
  zone?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
}

export interface SecuriteMission {
  id: number;
  agent_id?: number | null;
  agent_nom?: string | null;
  titre: string;
  client_nom?: string | null;
  lieu?: string | null;
  date_debut?: string | null;
  date_fin?: string | null;
  statut?: string | null;
  notes?: string | null;
  created_at?: string | null;
}

export interface SecuriteClient {
  id: number;
  nom: string;
  telephone?: string | null;
  adresse?: string | null;
  type_contrat?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
}

export interface SecuriteAnnouncement {
  id: number;
  titre: string;
  contenu: string;
  type?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
}

/** Tableau de bord (/dashboard) */
export interface TableauSecurite {
  success?: boolean;
  totalAgents?: number;
  missionsEnCours?: number;
  totalClients?: number;
  totalAnnouncements?: number;
  recentMissions?: SecuriteMission[];
}
