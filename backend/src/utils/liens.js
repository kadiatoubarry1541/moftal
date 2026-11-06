import { Op } from 'sequelize';
import { FamilyTree } from '../models/additional.js';
import CoupleLink from '../models/CoupleLink.js';
import ParentChildLink from '../models/ParentChildLink.js';
import ResidenceGroup from '../models/ResidenceGroup.js';

// ─── Liens entre deux personnes : un seul lien, le même partout ──────────────
// Famille (arbre, parents, conjoint, enfants) passe avant Voisin (même
// quartier), qui passe avant Ami (connaissance ou 💎 précieux). Un membre de
// la famille ou un voisin n'est jamais aussi un ami : vous êtes déjà liés.

// Normalise un nom de lieu : minuscule + sans accents (même règle que résidences)
export function normalizeLoc(str) {
  if (!str) return '';
  const n = String(str).trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  // « Non spécifié » (compte sans quartier) n'est pas un lieu : jamais de salle commune
  return n === 'non specifie' ? '' : n;
}

/** NumeroH exclus de "famille élargie" : soi-même, parents, conjoint(s), enfants — ils ont déjà leur propre messagerie dédiée. */
export async function getImmediateFamilyNumeroHs(numeroH) {
  const excluded = new Set([numeroH]);
  const [parentLinks, childLinks, coupleLinks] = await Promise.all([
    ParentChildLink.getMyParents(numeroH),
    ParentChildLink.getMyChildren(numeroH),
    CoupleLink.findAll({
      where: {
        [Op.or]: [{ husbandNumeroH: numeroH }, { wifeNumeroH: numeroH }],
        status: 'active', isActive: true, isArchived: false
      }
    })
  ]);
  parentLinks.forEach(l => excluded.add(l.parentNumeroH));
  childLinks.forEach(l => excluded.add(l.childNumeroH));
  coupleLinks.forEach(l => excluded.add(l.husbandNumeroH === numeroH ? l.wifeNumeroH : l.husbandNumeroH));
  return excluded;
}

/** Arbre familial (élargi) de l'utilisateur, ou null. */
export async function findMyFamilyTree(numeroH) {
  return FamilyTree.findOne({
    where: {
      [Op.or]: [
        { rootMember: numeroH },
        { members: { [Op.contains]: [numeroH] } },
        { chefFamille1: numeroH },
        { chefFamille2: numeroH }
      ],
      isActive: true
    }
  });
}

/** Groupes de quartier (Terre ADAM) de l'utilisateur, d'après ses lieux de résidence enregistrés. */
export async function findMyQuartierGroups(user) {
  const locations = [user?.lieu1, user?.lieu2, user?.lieu3].map(normalizeLoc).filter(Boolean);
  if (locations.length === 0) return [];
  return ResidenceGroup.findAll({ where: { location: { [Op.in]: locations }, isActive: true } });
}

/** Les numéroH de ma famille et de mes voisins (sans moi). */
export async function liensDe(user) {
  const numeroH = user?.numeroH;
  const famille = new Set();
  const voisin = new Set();
  if (!numeroH) return { famille, voisin };
  const [proches, arbre, quartiers] = await Promise.all([
    getImmediateFamilyNumeroHs(numeroH),
    findMyFamilyTree(numeroH),
    findMyQuartierGroups(user)
  ]);
  proches.forEach((nh) => famille.add(nh));
  (arbre?.members || []).forEach((nh) => famille.add(nh));
  [arbre?.rootMember, arbre?.chefFamille1, arbre?.chefFamille2].forEach((nh) => nh && famille.add(nh));
  quartiers.forEach((g) => (g.members || []).forEach((nh) => voisin.add(nh)));
  famille.delete(numeroH);
  voisin.delete(numeroH);
  famille.forEach((nh) => voisin.delete(nh));
  return { famille, voisin };
}

/**
 * Le lien avec une personne : 'famille', 'voisin', puis, s'il existe une
 * amitié (friend), 'activite' (conversation ouverte depuis la messagerie
 * entre gens de même activité), 'precieux' ou 'connaissance'. null sinon.
 */
export function lienAvec(liens, numeroH, friend = null) {
  if (liens.famille.has(numeroH)) return 'famille';
  if (liens.voisin.has(numeroH)) return 'voisin';
  if (!friend) return null;
  if (friend.origine === 'messagerie') return 'activite';
  return friend.precieuxUser && friend.precieuxFriend ? 'precieux' : 'connaissance';
}

export const LIEN_MESSAGE = {
  famille: 'Vous êtes déjà famille 🏠',
  voisin: 'Vous êtes déjà voisins 🏘️'
};
