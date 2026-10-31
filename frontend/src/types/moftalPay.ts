// Moftal Pay : portefeuilles des professionnels (backend/src/routes/MoftalPay.js).

/** Portefeuille d'un professionnel vu par l'administration */
export interface PortefeuillePro {
  id: string;
  nomPro?: string | null;
  typePro: string;
  ownerNumeroH?: string | null;
  solde: number;
  totalRecu: number;
  totalRetire: number;
  orangeMoney?: string | null;
  creeLe: string;
}

export interface TotauxPortefeuilles {
  totalSolde: number;
  totalRecu: number;
  totalRetire: number;
}

/** Demande de retrait d'un professionnel (/api/withdrawal-requests/mes-demandes) */
export interface DemandeRetrait {
  id: string;
  proAccountId?: string;
  ownerNom?: string | null;
  proAccountName?: string | null;
  proAccountType?: string | null;
  proLogoUrl?: string | null;
  montant: number;
  motif?: string | null;
  coordonneesPaiement?: string | null;
  /** « en_attente », « valide », « rejete » */
  statut: string;
  raisonRejet?: string | null;
  receiptRef?: string | null;
  valideParNom?: string | null;
  valideAt?: string | null;
  creeLe: string;
}
