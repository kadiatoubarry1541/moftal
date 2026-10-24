// Fin d'un abonnement payé (IA, Bibliothèque…) : chaque paiement prolonge la
// période à partir de la fin de la précédente — renouveler en avance ne fait
// plus perdre les jours restants. La date de départ d'un paiement est celle de
// sa confirmation (updatedAt), pas celle de son ouverture.
import { Op } from 'sequelize';
import Payment from '../models/Payment.js';

/** durees : { objet du paiement: nombre de mois }. Renvoie { fin, dernier } (fin = null si jamais payé). */
export async function finAbonnementPaye(numeroH, durees) {
  if (!numeroH) return { fin: null, dernier: null };
  const paiements = await Payment.findAll({
    where: { payerNumeroH: numeroH, purpose: { [Op.in]: Object.keys(durees) }, status: 'completed' },
    order: [['updatedAt', 'ASC']],
  });
  let fin = null;
  for (const p of paiements) {
    const paye = new Date(p.updatedAt || p.createdAt);
    const debut = fin && fin > paye ? new Date(fin) : paye;
    debut.setMonth(debut.getMonth() + (durees[p.purpose] || 0));
    fin = debut;
  }
  return { fin, dernier: paiements[paiements.length - 1] || null };
}

export const DUREES_IA = { subscription_ia_mois: 1, subscription_ia_an: 12 };
export const DUREES_LIVRES = { subscription_livres_an: 12 };
