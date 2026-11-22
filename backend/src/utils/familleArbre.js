// Espace Famille (messages, galerie partagée, médias « problèmes ») : il appartient
// aux arbres familiaux de la personne, jamais à tous ceux qui portent le même nom.
// Avant, tous les « Diallo » du pays lisaient les messages et les photos des autres
// Diallo (et n'importe qui pouvait écrire « Diallo » dans son profil pour y entrer).
// Les données gardent leur colonne family_name : on filtre en plus par auteur, qui
// doit être membre d'un des arbres de la personne.
import { Op } from 'sequelize';
import { FamilyTree } from '../models/additional.js';

/** Arbres actifs dont la personne est membre. */
export async function arbresDe(numeroH) {
  if (!numeroH) return [];
  return FamilyTree.findAll({
    where: { members: { [Op.contains]: [numeroH] }, isActive: true },
    attributes: ['id', 'members'],
  });
}

/** NuméroH des membres de ses arbres (elle-même comprise). */
export async function membresDeMaFamille(numeroH, arbres = null) {
  const liste = arbres || await arbresDe(numeroH);
  const membres = new Set(numeroH ? [numeroH] : []);
  for (const a of liste) for (const n of (Array.isArray(a.members) ? a.members : [])) if (n) membres.add(n);
  return membres;
}

/** Salons temps réel de ses arbres (un par arbre). */
export function salonsFamille(arbres) {
  return (arbres || []).map((a) => `famille-arbre-${a.id}`);
}
