// Données de la gestion interne d'une entreprise, telles que le serveur les renvoie
// (backend/src/routes/enterprise-management.js, tables enterprise_* de server.js).

export type Montant = number | string;

export type { EtablissementGestion } from "./pro";

export interface Employe {
  id: number;
  nom: string;
  prenom?: string | null;
  telephone?: string | null;
  numero_h?: string | null;
  poste?: string | null;
  departement?: string | null;
  is_active?: boolean;
  created_at?: string;
}

export interface ClientEntreprise {
  id: number;
  nom: string;
  telephone?: string | null;
  adresse?: string | null;
  secteur?: string | null;
  is_active?: boolean;
  created_at?: string;
}

export interface Contrat {
  id: number;
  titre: string;
  client_nom?: string | null;
  client_id?: number | null;
  budget?: Montant | null;
  statut: string;
  date_debut?: string | null;
  date_fin?: string | null;
  description?: string | null;
  created_at?: string;
}

export interface Annonce {
  id: number;
  titre: string;
  contenu?: string | null;
  type: string;
  is_active?: boolean;
  created_at?: string;
}

/** Tableau de bord (/dashboard) */
export interface TableauEntreprise {
  success?: boolean;
  totalEmployees?: number;
  totalClients?: number;
  contratsEnCours?: number;
  caTotal?: number;
  recentContracts?: Contrat[];
}

/** Réponse d'un envoi au serveur */
export interface ReponseEntreprise {
  success?: boolean;
  message?: string;
}
