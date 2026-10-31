// Données de la gestion interne d'une mairie (état civil), telles que le serveur
// les renvoie (backend/src/routes/mairie-management.js, tables mairie_* de server.js).

export interface EtablissementMairie {
  tenant_code: string;
  name: string;
  owner_numero_h?: string;
  is_active?: boolean;
  logo_url?: string | null;
  address?: string;
  phone?: string;
  email?: string;
  description?: string;
}

export interface StatsMairie {
  mariagesMois?: number;
  mariagesEnAttente?: number;
  naissancesMois?: number;
  decesMois?: number;
  agents?: number;
  mariagesAujourdhui?: number;
  naissancesAujourdhui?: number;
}

interface Dossier {
  id: number;
  tenant_code?: string;
  numero_dossier: string;
  statut: string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ActeMariage extends Dossier {
  epoux_nom: string;
  epoux_prenom: string;
  epoux_ddn?: string | null;
  epoux_numero_h?: string | null;
  epouse_nom: string;
  epouse_prenom: string;
  epouse_ddn?: string | null;
  epouse_numero_h?: string | null;
  date_mariage: string;
  lieu_mariage: string;
  temoin1_nom?: string | null;
  temoin2_nom?: string | null;
}

export interface ActeNaissance extends Dossier {
  enfant_nom: string;
  enfant_prenom: string;
  date_naissance: string;
  lieu_naissance: string;
  sexe: string;
  pere_nom?: string | null;
  pere_prenom?: string | null;
  mere_nom?: string | null;
  mere_prenom?: string | null;
  declarant_nom?: string | null;
}

export interface ActeDeces extends Dossier {
  defunt_nom: string;
  defunt_prenom: string;
  defunt_ddn?: string | null;
  defunt_numero_h?: string | null;
  date_deces: string;
  lieu_deces: string;
  cause_deces: string;
  declarant_nom?: string | null;
  declarant_telephone?: string | null;
}

export interface Residence extends Dossier {
  nom: string;
  prenom: string;
  date_naissance?: string | null;
  numero_h?: string | null;
  adresse: string;
  depuis_quand: string;
  motif: string;
  // Le formulaire envoie "" quand aucun chef n'est choisi
  chef_quartier_id?: number | string | null;
  chef_quartier_nom?: string | null;
  chef_quartier_telephone?: string | null;
  chef_quartier_valide?: boolean;
  chef_quartier_date?: string | null;
}

export interface ChefQuartier {
  id: number;
  nom: string;
  prenom: string;
  quartier: string;
  telephone?: string | null;
  date_prise_fonction?: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface AgentMairie {
  id: number;
  nom: string;
  prenom: string;
  role: string;
  telephone?: string | null;
  email?: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface ValidationChef {
  chef_quartier_nom?: string;
  chef_quartier_telephone?: string;
  valide?: boolean;
}

export interface ParametresMairie {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  description?: string;
  logo_url?: string | null;
}

/** Réponse du serveur : chaque route remplit la clé qui la concerne. */
export interface ReponseMairie {
  success?: boolean;
  message?: string;
  tenant?: EtablissementMairie;
  stats?: StatsMairie;
  recentMariages?: ActeMariage[];
  mariages?: ActeMariage[];
  naissances?: ActeNaissance[];
  deces?: ActeDeces[];
  residences?: Residence[];
  chefs?: ChefQuartier[];
  agents?: AgentMairie[];
}
