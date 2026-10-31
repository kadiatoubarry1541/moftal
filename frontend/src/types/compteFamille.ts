// Compte famille (fonds communs) : /api/family-fund (backend/src/routes/familyFund.js).
// Le serveur renvoie les montants déjà convertis en nombres.

/** Solde de chaque fonds du compte famille */
export interface SoldesFamille {
  reserve: number;
  sante: number;
  nourriture: number;
  urgence: number;
  projet: number;
  total: number;
}

/** Compte famille vu par l'administration (/admin/tous) */
export interface CompteFamilleAdmin {
  id: string;
  nomFamille: string;
  gerant1?: string | null;
  gerant2?: string | null;
  soldes: SoldesFamille;
  totalDepose: number;
  totalDepense: number;
  creeLe?: string;
}

/** Totaux sur toute la plateforme */
export interface TotauxFamilles extends SoldesFamille {
  depose: number;
  depense: number;
}

/** Mouvement d'un compte famille (dépôt, dépense, retrait…) */
export interface TransactionFamille {
  id: string;
  type: string;
  montant: number;
  acteurNumeroH?: string | null;
  acteurNom?: string | null;
  beneficiaireNom?: string | null;
  beneficiaireContact?: string | null;
  description?: string | null;
  repartition?: Record<string, number> | null;
  fedapayRef?: string | null;
  statut?: string | null;
  date: string;
}

/** Compte famille de l'utilisateur (/mon-compte) */
export interface CompteFamille extends Omit<CompteFamilleAdmin, "creeLe">, Omit<import("./arbre").ChefsArbre, "gerant1" | "gerant2"> {
  familyCode?: string | null;
  bloodNumber?: string | null;
  conseiller?: string | null;
}

/** Riz vendu par Moftal aux familles (/riz-info) */
export interface InfosRiz {
  success?: boolean;
  disponible: boolean;
  prixParSac?: number;
}

/** Don enregistré (historique des dons de l'utilisateur) */
export interface DonServeur {
  de_nom?: string | null;
  vers_nom?: string | null;
  montant: number | string;
  currency?: string | null;
  description?: string | null;
  /** « confirme » ou en attente */
  statut?: string | null;
  created_at: string;
}
