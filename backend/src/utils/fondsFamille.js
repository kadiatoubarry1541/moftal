// Compte Moftal Pay d'une famille : il appartient à un ARBRE familial (une
// lignée), jamais à un simple nom de famille. Avant, tous les « Diallo » du site
// partageaient le même compte et le premier venu en devenait gérant.
import { Op } from 'sequelize';
import FamilyFund from '../models/FamilyFund.js';
import { FamilyTree } from '../models/additional.js';

/** Arbre familial de la personne : celui de sa lignée (même nom de famille) d'abord. */
export async function arbreDe(user) {
  const numeroH = user?.numeroH;
  if (!numeroH) return null;
  const arbres = await FamilyTree.findAll({
    where: { members: { [Op.contains]: [numeroH] }, isActive: true },
    order: [['createdAt', 'ASC']],
  });
  if (!arbres.length) return null;
  const nom = String(user.nomFamille || '').trim().toLowerCase();
  return arbres.find((a) => String(a.familyName || '').trim().toLowerCase() === nom) || arbres[0];
}

export function nbMembresArbre(arbre) {
  return Array.isArray(arbre?.members) ? arbre.members.length : 0;
}

export function estMembreArbre(arbre, numeroH) {
  return !!numeroH && Array.isArray(arbre?.members) && arbre.members.includes(numeroH);
}

/**
 * Compte famille de la personne (et son arbre). Un ancien compte créé par nom
 * de famille est rattaché à l'arbre dont un de ses responsables est membre.
 * options.transaction / options.lock : pour verrouiller le compte pendant un débit.
 */
export async function fondsDe(user, { transaction, lock } = {}) {
  const arbre = await arbreDe(user);
  if (!arbre) return { fund: null, arbre: null };
  const chercher = () => FamilyFund.findOne({
    where: { treeId: arbre.id, isActive: true },
    transaction,
    ...(lock && transaction ? { lock: transaction.LOCK.UPDATE } : {}),
  });
  let fund = await chercher();
  if (!fund && user?.nomFamille) {
    const anciens = await FamilyFund.findAll({
      where: { treeId: null, isActive: true, nomFamille: { [Op.iLike]: String(user.nomFamille).trim() } },
      order: [['created_at', 'ASC']],
      transaction,
    });
    const ancien = anciens.find((f) => [f.gerant1NumeroH, f.gerant2NumeroH, f.conseillerNumeroH].some((n) => estMembreArbre(arbre, n)));
    if (ancien) {
      await FamilyFund.update({ treeId: arbre.id }, { where: { id: ancien.id, treeId: null }, transaction });
      fund = await chercher();
    }
  }
  return { fund, arbre };
}
