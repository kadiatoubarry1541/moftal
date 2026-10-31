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
