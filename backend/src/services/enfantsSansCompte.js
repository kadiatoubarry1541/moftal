import crypto from 'crypto';
import { Op } from 'sequelize';
import User from '../models/User.js';
import ParentChildLink from '../models/ParentChildLink.js';
import CoupleLink from '../models/CoupleLink.js';
import EnfantSansCompte from '../models/EnfantSansCompte.js';
import Notification from '../models/Notification.js';
import { FamilyTree } from '../models/additional.js';

// Enfants ajoutés par un parent sans compte Moftal (voir models/EnfantSansCompte.js).

export const PREFIXE_FICHE = 'ENF-';
export const estFiche = (numeroH) => typeof numeroH === 'string' && numeroH.startsWith(PREFIXE_FICHE);

let tablePrete = null;
export function ensureTableFiches() {
  if (!tablePrete) tablePrete = EnfantSansCompte.sync().catch((e) => { tablePrete = null; throw e; });
  return tablePrete;
}

export function nouveauNumeroFiche() {
  return `${PREFIXE_FICHE}${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
}

const sansAccents = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Normalise un prénom pour comparer (« Mamadou » = « mamadou », accents ignorés). */
export function normaliserPrenom(p) {
  return sansAccents(p).toLowerCase().replace(/[^a-z]/g, '');
}

/**
 * Clé de l'extrait de naissance : un numéro n'est unique que dans une commune
 * ET une année (les registres recommencent chaque année). Le numéro seul ne
 * suffit jamais. Retourne null si les 3 ne sont pas tous renseignés.
 */
export function cleExtrait({ numero, commune, annee }) {
  // « N° 0125 », « No 125 », « Num. 125 » et « 125 » : le même numéro
  const n = sansAccents(numero).toUpperCase().trim()
    .replace(/^(NUMERO|NUM|NO|N)\s*[.:°º#]?\s*(?=\d)/, '')
    .replace(/[^0-9A-Z]/g, '').replace(/^0+(?=\d)/, '');
  const c = sansAccents(commune).toLowerCase()
    .replace(/\b(commune|cu|cr|de|du|la|le|urbaine|rurale)\b/g, ' ')
    .replace(/[^a-z0-9]/g, '');
  const a = String(annee || '').replace(/[^0-9]/g, '');
  if (!n || !c || a.length !== 4) return null;
  return `${n}|${c}|${a}`;
}

const memeDate = (a, b) => !!a && !!b && String(a).slice(0, 10) === String(b).slice(0, 10);

/** Représentation d'une fiche comme un membre de la famille (même forme qu'un compte). */
export function ficheCommeMembre(f, { avecPapiers = false } = {}) {
  return {
    numeroH: f.numero,
    prenom: f.prenom,
    nomFamille: f.nomFamille || '',
    genre: f.genre,
    dateNaissance: f.dateNaissance || null,
    dateDeces: f.estVivant ? null : (f.dateDeces || null),
    photo: f.photo || null,
    type: f.estVivant ? 'vivant' : 'defunt',
    sansCompte: true,
    estVivant: f.estVivant,
    ficheId: f.id,
    ...(avecPapiers ? {
      quartierNaissance: f.quartierNaissance || null,
      extraitNumero: f.extraitNumero || null,
      extraitCommune: f.extraitCommune || null,
      extraitAnnee: f.extraitAnnee || null,
      autreParentNom: f.autreParentNom || null,
      creePar: f.creePar
    } : {})
  };
}

/** Fiches (non fusionnées) pour une liste d'identifiants ENF-…, indexées par numéro. */
export async function fichesParNumero(numeros) {
  const liste = [...new Set((numeros || []).filter(estFiche))];
  if (!liste.length) return new Map();
  await ensureTableFiches();
  const fiches = await EnfantSansCompte.findAll({ where: { numero: { [Op.in]: liste }, isActive: true, fusionneAvec: null } });
  return new Map(fiches.map((f) => [f.numero, f]));
}

/** La personne fait-elle partie de la famille de ce parent ? (pour cacher les enfants vivants aux autres) */
export async function estDeLaFamille(demandeur, parentNumeroH) {
  if (!demandeur || !parentNumeroH) return false;
  if (demandeur === parentNumeroH) return true;
  const [couple, pc] = await Promise.all([
    CoupleLink.findOne({
      where: {
        [Op.or]: [
          { husbandNumeroH: demandeur, wifeNumeroH: parentNumeroH },
          { husbandNumeroH: parentNumeroH, wifeNumeroH: demandeur }
        ],
        isActive: true
      }
    }),
    ParentChildLink.findOne({
      where: {
        [Op.or]: [
          { parentNumeroH: demandeur, childNumeroH: parentNumeroH },
          { parentNumeroH: parentNumeroH, childNumeroH: demandeur }
        ],
        status: 'active', isActive: true
      }
    })
  ]);
  if (couple || pc) return true;
  const arbre = await FamilyTree.findOne({
    where: { members: { [Op.contains]: [demandeur] }, isActive: true }
  }).catch(() => null);
  return !!arbre && (arbre.members || []).includes(parentNumeroH);
}

/** Parents reliés à une fiche (liens actifs). */
export async function parentsDeLaFiche(numero) {
  return ParentChildLink.findAll({ where: { childNumeroH: numero, isActive: true, status: 'active' } });
}

export async function estParentDeLaFiche(numeroH, fiche) {
  if (!fiche) return false;
  const numeroLien = fiche.fusionneAvec || fiche.numero;
  const lien = await ParentChildLink.findOne({
    where: { parentNumeroH: numeroH, childNumeroH: { [Op.in]: [fiche.numero, numeroLien] }, isActive: true }
  });
  return !!lien || fiche.creePar === numeroH;
}

async function notifier(destinataire, title, message, relatedId) {
  try {
    await Notification.createNotification({ recipientNumeroH: destinataire, type: 'general', title, message, relatedId });
  } catch (e) { console.error('notif enfant sans compte:', e.message); }
}

/** Crée (ou réactive) le lien parent → fiche/compte, sans jamais violer l'unicité (parent, enfant, rôle). */
export async function lierParent(parentNumeroH, enfantNumeroH, parentType) {
  const existant = await ParentChildLink.findOne({ where: { parentNumeroH, childNumeroH: enfantNumeroH, parentType } });
  if (existant) {
    if (!existant.isActive || existant.status !== 'active') {
      await existant.update({ isActive: true, status: 'active', confirmedAt: new Date() });
    }
    return existant;
  }
  return ParentChildLink.create({
    parentNumeroH, childNumeroH: enfantNumeroH, parentType, status: 'active', confirmedAt: new Date()
  });
}

export const typeParent = (genre) => (String(genre || '').toUpperCase() === 'FEMME' ? 'mere' : 'pere');

/**
 * Fusion : la fiche devient le compte de l'enfant. Les liens des parents passent
 * de ENF-… au vrai NuméroH ; le père/la mère du profil sont remplis s'ils sont vides.
 * Tout est mémorisé pour pouvoir annuler.
 */
export async function fusionnerFiche(fiche, numeroH) {
  const user = await User.findByNumeroH(numeroH);
  if (!user) throw new Error('Compte introuvable');
  const liens = await ParentChildLink.findAll({ where: { childNumeroH: fiche.numero, isActive: true } });
  const historique = { liens: [], champs: {} };

  for (const lien of liens) {
    const deja = await ParentChildLink.findOne({
      where: { parentNumeroH: lien.parentNumeroH, childNumeroH: numeroH, parentType: lien.parentType }
    });
    if (deja) {
      historique.liens.push({ id: deja.id, action: 'reactive', avant: { isActive: deja.isActive, status: deja.status } });
      await deja.update({ isActive: true, status: 'active', confirmedAt: deja.confirmedAt || new Date() });
      historique.liens.push({ id: lien.id, action: 'desactive' });
      await lien.update({ isActive: false });
    } else {
      historique.liens.push({ id: lien.id, action: 'deplace' });
      await lien.update({ childNumeroH: numeroH });
    }
  }

  const pere = liens.find((l) => l.parentType === 'pere')?.parentNumeroH;
  const mere = liens.find((l) => l.parentType === 'mere')?.parentNumeroH;
  const maj = {};
  if (pere && !user.numeroHPere) maj.numeroHPere = pere;
  if (mere && !user.numeroHMere) maj.numeroHMere = mere;
  if (fiche.photo && !user.photo) maj.photo = fiche.photo;
  if (Object.keys(maj).length) {
    historique.champs = Object.fromEntries(Object.keys(maj).map((k) => [k, user[k] ?? null]));
    await user.update(maj);
  }

  await fiche.update({ fusionneAvec: numeroH, fusionneLe: new Date(), liensFusionnes: historique });

  try {
    const { addUserToFamilyTree } = await import('../routes/familyTree.js');
    await addUserToFamilyTree(numeroH, pere || user.numeroHPere, mere || user.numeroHMere);
  } catch (e) { console.error('fusion fiche → arbre:', e.message); }

  const nomEnfant = [user.prenom, user.nomFamille].filter(Boolean).join(' ') || fiche.prenom;
  for (const p of new Set(liens.map((l) => l.parentNumeroH))) {
    await notifier(p, 'Votre enfant a rejoint Moftal',
      `${nomEnfant} a maintenant son propre compte : sa fiche d'enfant a été reliée à son compte. Si ce n'est pas votre enfant, annulez la fusion depuis « Mes enfants ».`, fiche.id);
  }
  await notifier(numeroH, 'Vous êtes relié(e) à vos parents',
    `Votre compte est maintenant relié à la fiche que vos parents avaient créée pour vous dans leur arbre.`, fiche.id);
  return user;
}

/** Annule une fusion faite par erreur : tout revient comme avant. */
export async function annulerFusion(fiche) {
  const h = fiche.liensFusionnes || {};
  for (const l of (h.liens || []).slice().reverse()) {
    const lien = await ParentChildLink.findByPk(l.id);
    if (!lien) continue;
    if (l.action === 'deplace') await lien.update({ childNumeroH: fiche.numero });
    else if (l.action === 'desactive') await lien.update({ isActive: true });
    else if (l.action === 'reactive') await lien.update({ isActive: l.avant.isActive, status: l.avant.status });
  }
  if (fiche.fusionneAvec && h.champs && Object.keys(h.champs).length) {
    const user = await User.findByNumeroH(fiche.fusionneAvec);
    if (user) await user.update(h.champs);
  }
  await fiche.update({ fusionneAvec: null, fusionneLe: null, liensFusionnes: {} });
}

/**
 * Compte qui correspond à une fiche sans papiers : même prénom, même date de
 * naissance, et déjà relié (ou déclaré) à l'un des parents. Une proposition —
 * c'est toujours un parent qui confirme.
 */
export async function comptesCorrespondants(fiche) {
  if (!fiche.dateNaissance) return [];
  const parents = (await parentsDeLaFiche(fiche.numero)).map((l) => l.parentNumeroH);
  if (!parents.length) return [];
  const candidats = await User.findAll({
    where: {
      dateNaissance: fiche.dateNaissance,
      isActive: true,
      numeroH: { [Op.notLike]: 'TMP-%' },
      [Op.or]: [{ numeroHPere: { [Op.in]: parents } }, { numeroHMere: { [Op.in]: parents } }]
    },
    attributes: ['numeroH', 'prenom', 'nomFamille', 'photo', 'dateNaissance'],
    limit: 20
  });
  const liensVersComptes = await ParentChildLink.findAll({
    where: { parentNumeroH: { [Op.in]: parents }, childNumeroH: { [Op.notLike]: `${PREFIXE_FICHE}%` }, isActive: true }
  });
  const autres = liensVersComptes.length
    ? await User.findAll({
      where: { numeroH: { [Op.in]: liensVersComptes.map((l) => l.childNumeroH) }, dateNaissance: fiche.dateNaissance },
      attributes: ['numeroH', 'prenom', 'nomFamille', 'photo', 'dateNaissance']
    })
    : [];
  const prenom = normaliserPrenom(fiche.prenom);
  const vus = new Set();
  return [...candidats, ...autres].filter((u) => {
    if (vus.has(u.numeroH) || normaliserPrenom(u.prenom) !== prenom) return false;
    vus.add(u.numeroH);
    return true;
  }).map((u) => ({ numeroH: u.numeroH, prenom: u.prenom, nomFamille: u.nomFamille, photo: u.photo, dateNaissance: u.dateNaissance }));
}

export { memeDate };
