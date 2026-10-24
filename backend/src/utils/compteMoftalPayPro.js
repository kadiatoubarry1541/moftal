// Compte pro dont le Moftal Pay Pro est affiché, crédité par les dépôts et
// débité par les retraits : toujours le même (avant, un propriétaire de
// plusieurs comptes voyait un compte et en créditait un autre).
import { Op } from 'sequelize';
import ProfessionalAccount from '../models/ProfessionalAccount.js';

// Moftal Pay Pro : Santé (clinic) et Alimentation (supplier), formule
// Visibilité + Gestion Interne (jamais la formule Visibilité + Rendez-vous)
export const MOFTAL_PAY_PRO_TYPES = ['clinic', 'supplier'];

export async function compteMoftalPayPro(ownerNumeroH, options = {}) {
  if (!ownerNumeroH) return null;
  return ProfessionalAccount.findOne({
    where: {
      ownerNumeroH,
      status: 'approved',
      isActive: true,
      type: { [Op.in]: MOFTAL_PAY_PRO_TYPES },
      planType: { [Op.or]: [{ [Op.ne]: 'visibility' }, { [Op.is]: null }] },
    },
    order: [['created_at', 'ASC']],
    ...options,
  });
}
