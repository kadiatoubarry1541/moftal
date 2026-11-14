// Compte pro dont le Moftal Pay Pro est affiché, crédité par les dépôts et
// débité par les retraits : toujours le même (avant, un propriétaire de
// plusieurs comptes voyait un compte et en créditait un autre).
import { Op } from 'sequelize';
import ProfessionalAccount from '../models/ProfessionalAccount.js';

// Moftal Pay Pro : tous les secteurs en formule Visibilité + Gestion Interne
// (jamais la formule Visibilité + Rendez-vous) — CLAUDE.md, règle 1.
export const formuleAvecMoftalPay = (planType) => planType !== 'visibility';

export async function compteMoftalPayPro(ownerNumeroH, options = {}) {
  if (!ownerNumeroH) return null;
  return ProfessionalAccount.findOne({
    where: {
      ownerNumeroH,
      status: 'approved',
      isActive: true,
      planType: { [Op.or]: [{ [Op.ne]: 'visibility' }, { [Op.is]: null }] },
    },
    order: [['created_at', 'ASC']],
    ...options,
  });
}
