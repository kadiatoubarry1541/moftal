import express from 'express';
import { authenticate } from '../middleware/auth.js';
import User from '../models/User.js';
import CoupleLink from '../models/CoupleLink.js';
import ParentChildLink from '../models/ParentChildLink.js';
import FamilyCoreEntry from '../models/FamilyCoreEntry.js';

const router = express.Router();
router.use(authenticate);

const mapMember = (u) => ({
  numeroH: u.numeroH,
  prenom: u.prenom,
  nomFamille: u.nomFamille,
  photo: u.photo || null,
  genre: u.genre,
  type: u.type,
  dateDeces: u.dateDeces || null
});

const mapEntry = (e) => ({
  id: e.id,
  type: e.type,
  title: e.title,
  content: e.content,
  visibility: e.visibility,
  createdAt: e.created_at
});

/**
 * Construit la composition et le statut (actif/archivé) du noyau d'un fondateur.
 *
 * - Le noyau = le fondateur + (si HOMME) ses épouses actives + tous ses enfants confirmés.
 * - Le noyau est "actif" tant que le fondateur OU au moins une de ses épouses
 *   (toute épouse ayant eu un lien avec lui, même rompu/archivé) est en vie.
 */
async function buildNoyauComposition(founder) {
  const childLinks = await ParentChildLink.getMyChildren(founder.numeroH);
  const childNumeroHs = childLinks.map((l) => l.childNumeroH);
  const children = childNumeroHs.length
    ? await User.findAll({ where: { numeroH: childNumeroHs } })
    : [];

  let wives = [];
  let status = 'actif';

  if (founder.genre === 'HOMME') {
    const activeWifeLinks = await CoupleLink.getMyWives(founder.numeroH);
    const activeWifeNumeroHs = activeWifeLinks.map((l) => l.wifeNumeroH).filter(Boolean);
    if (activeWifeNumeroHs.length) {
      wives = await User.findAll({ where: { numeroH: activeWifeNumeroHs } });
    }

    if (founder.type === 'defunt') {
      const allWifeLinks = await CoupleLink.findAll({ where: { husbandNumeroH: founder.numeroH } });
      const allWifeNumeroHs = [...new Set(allWifeLinks.map((l) => l.wifeNumeroH).filter(Boolean))];
      if (allWifeNumeroHs.length === 0) {
        status = 'archive';
      } else {
        const allWives = await User.findAll({ where: { numeroH: allWifeNumeroHs } });
        status = allWives.every((w) => w.type === 'defunt') ? 'archive' : 'actif';
      }
    }
  } else if (founder.type === 'defunt') {
    status = 'archive';
  }

  return { wives, children, status };
}

/**
 * GET /api/family-core/mine
 * Mon propre noyau (je suis fondateur dès que j'ai au moins un enfant confirmé).
 */
router.get('/mine', async (req, res) => {
  try {
    const user = req.user;
    const childLinks = await ParentChildLink.getMyChildren(user.numeroH);
    if (!childLinks.length) {
      return res.json({ success: true, exists: false });
    }

    const { wives, children, status } = await buildNoyauComposition(user);
    const entries = await FamilyCoreEntry.getByFounder(user.numeroH);

    res.json({
      success: true,
      exists: true,
      isFounder: true,
      founder: mapMember(user),
      wives: wives.map(mapMember),
      children: children.map(mapMember),
      status,
      entries: entries.map(mapEntry)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/family-core/parent/:parentType (pere | mere)
 * Le noyau de mon père ou de ma mère (le fondateur n'est pas moi).
 * Les entrées "scellées" du livre ne sont visibles que si le fondateur est décédé.
 */
router.get('/parent/:parentType', async (req, res) => {
  try {
    const { parentType } = req.params;
    if (!['pere', 'mere'].includes(parentType)) {
      return res.status(400).json({ success: false, message: 'Type de parent invalide.' });
    }

    const user = req.user;
    const parentLinks = await ParentChildLink.getMyParents(user.numeroH);
    const link = parentLinks.find((l) => l.parentType === parentType);
    if (!link) {
      return res.json({ success: true, exists: false });
    }

    const founder = await User.findByNumeroH(link.parentNumeroH);
    if (!founder) {
      return res.json({ success: true, exists: false });
    }

    const { wives, children, status } = await buildNoyauComposition(founder);
    const allEntries = await FamilyCoreEntry.getByFounder(founder.numeroH);
    const founderDeceased = founder.type === 'defunt';
    const entries = allEntries
      .filter((e) => e.visibility === 'visible' || founderDeceased)
      .map(mapEntry);

    res.json({
      success: true,
      exists: true,
      isFounder: false,
      founder: mapMember(founder),
      wives: wives.map(mapMember),
      children: children.map(mapMember),
      status,
      entries
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/family-core/entries
 * Ajoute une entrée au livre de MON noyau (texte, audio ou vidéo).
 * Réservé au fondateur (au moins un enfant confirmé).
 */
router.post('/entries', async (req, res) => {
  try {
    const user = req.user;
    const { type, title, content, visibility } = req.body;

    const childLinks = await ParentChildLink.getMyChildren(user.numeroH);
    if (!childLinks.length) {
      return res.status(403).json({
        success: false,
        message: 'Seul le fondateur d\'un noyau (ayant au moins un enfant confirmé) peut écrire dans le livre.'
      });
    }

    if (!['texte', 'audio', 'video'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Type d\'entrée invalide.' });
    }
    if (!content || !String(content).trim()) {
      return res.status(400).json({ success: false, message: 'Le contenu est obligatoire.' });
    }

    const entry = await FamilyCoreEntry.create({
      founderNumeroH: user.numeroH,
      type,
      title: title?.trim() || null,
      content,
      visibility: visibility === 'scelle' ? 'scelle' : 'visible'
    });

    res.json({ success: true, entry: mapEntry(entry) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/family-core/entries/:id
 * Modifie une entrée (titre, contenu, visibilité). Réservé à son auteur.
 */
router.put('/entries/:id', async (req, res) => {
  try {
    const user = req.user;
    const entry = await FamilyCoreEntry.findByPk(req.params.id);
    if (!entry || entry.founderNumeroH !== user.numeroH) {
      return res.status(404).json({ success: false, message: 'Entrée introuvable.' });
    }

    const { title, content, visibility } = req.body;
    if (title !== undefined) entry.title = title?.trim() || null;
    if (content !== undefined && String(content).trim()) entry.content = content;
    if (visibility !== undefined) entry.visibility = visibility === 'scelle' ? 'scelle' : 'visible';
    await entry.save();

    res.json({ success: true, entry: mapEntry(entry) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/family-core/entries/:id
 * Retire une entrée du livre (suppression douce). Réservé à son auteur.
 */
router.delete('/entries/:id', async (req, res) => {
  try {
    const user = req.user;
    const entry = await FamilyCoreEntry.findByPk(req.params.id);
    if (!entry || entry.founderNumeroH !== user.numeroH) {
      return res.status(404).json({ success: false, message: 'Entrée introuvable.' });
    }

    entry.isActive = false;
    await entry.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
