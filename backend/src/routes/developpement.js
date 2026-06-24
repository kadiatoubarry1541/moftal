import express from 'express';
import { authenticate } from '../middleware/auth.js';
import DeveloppementDon from '../models/DeveloppementDon.js';
import DevActualite from '../models/DevActualite.js';
import DevProjet from '../models/DevProjet.js';
import DevSignalement from '../models/DevSignalement.js';

const router = express.Router();

const isJournalistOrAdmin = (user) =>
  user.isMasterAdmin ||
  user.role === 'admin' ||
  user.role === 'super-admin' ||
  user.role === 'journalist' ||
  user.isJournalist === true;

// ─── COTISATIONS (quartier + sous-préfecture uniquement) ────────────────────

router.get('/stats', authenticate, async (req, res) => {
  try {
    const { scope = 'mondial', location = 'mondial' } = req.query;
    const dons = await DeveloppementDon.findAll({ where: { scope, location: location.toLowerCase() } });
    const totalCollecte = dons.reduce((sum, d) => sum + parseFloat(d.amount), 0);
    const nbDonneurs = new Set(dons.map(d => d.numeroH)).size;
    const parDomaine = {};
    dons.forEach(d => { parDomaine[d.domaine] = (parDomaine[d.domaine] || 0) + parseFloat(d.amount); });
    res.json({ success: true, totalCollecte, parDomaine, nbDonneurs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/mes-dons', authenticate, async (req, res) => {
  try {
    const { scope, location } = req.query;
    const where = { numeroH: req.user.numeroH };
    if (scope) where.scope = scope;
    if (location) where.location = location.toLowerCase();
    const dons = await DeveloppementDon.findAll({ where, order: [['created_at', 'DESC']], limit: 50 });
    res.json({ success: true, dons });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/donate', authenticate, async (req, res) => {
  try {
    const { amount, currency, domaine, domaineLabel, message, scope, location } = req.body;
    if (!amount || parseFloat(amount) <= 0)
      return res.status(400).json({ success: false, message: 'Montant invalide' });
    if (!scope || !location)
      return res.status(400).json({ success: false, message: 'Scope et location requis' });
    const don = await DeveloppementDon.create({
      numeroH: req.user.numeroH,
      amount: parseFloat(amount),
      currency: currency || 'FG',
      domaine: domaine || 'general',
      domaineLabel: domaineLabel || 'Fonds Général',
      message: message || null,
      scope,
      location: location.toLowerCase(),
    });
    res.json({ success: true, don });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── ACTUALITÉS (préfecture → mondial) ─────────────────────────────────────

router.get('/actualites', authenticate, async (req, res) => {
  try {
    const { scope, location } = req.query;
    if (!scope || !location)
      return res.status(400).json({ success: false, message: 'scope et location requis' });
    const actualites = await DevActualite.findAll({
      where: { scope, location: location.toLowerCase() },
      order: [['created_at', 'DESC']],
      limit: 50
    });
    res.json({ success: true, actualites });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/actualites', authenticate, async (req, res) => {
  try {
    if (!isJournalistOrAdmin(req.user))
      return res.status(403).json({ success: false, message: 'Réservé aux journalistes et administrateurs' });
    const { titre, content, mediaUrl, mediaType, domaine, scope, location } = req.body;
    if (!titre || !content || !scope || !location)
      return res.status(400).json({ success: false, message: 'Titre, contenu, scope et location requis' });
    const actu = await DevActualite.create({
      numeroH: req.user.numeroH,
      authorName: `${req.user.prenom || ''} ${req.user.nomFamille || ''}`.trim() || req.user.numeroH,
      titre,
      content,
      mediaUrl: mediaUrl || null,
      mediaType: mediaType || 'text',
      domaine: domaine || null,
      scope,
      location: location.toLowerCase(),
    });
    res.json({ success: true, actualite: actu });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/actualites/:id', authenticate, async (req, res) => {
  try {
    if (!isJournalistOrAdmin(req.user))
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    await DevActualite.destroy({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PROJETS GOUVERNEMENTAUX ────────────────────────────────────────────────

router.get('/projets', authenticate, async (req, res) => {
  try {
    const { scope, location } = req.query;
    if (!scope || !location)
      return res.status(400).json({ success: false, message: 'scope et location requis' });
    const projets = await DevProjet.findAll({
      where: { scope, location: location.toLowerCase() },
      order: [['created_at', 'DESC']]
    });
    res.json({ success: true, projets });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/projets', authenticate, async (req, res) => {
  try {
    if (!isJournalistOrAdmin(req.user))
      return res.status(403).json({ success: false, message: 'Réservé aux journalistes et administrateurs' });
    const { titre, description, domaine, statut, budget, source, dateDebut, dateFin, scope, location } = req.body;
    if (!titre || !scope || !location)
      return res.status(400).json({ success: false, message: 'Titre, scope et location requis' });
    const projet = await DevProjet.create({
      authorNumeroH: req.user.numeroH,
      authorName: `${req.user.prenom || ''} ${req.user.nomFamille || ''}`.trim() || req.user.numeroH,
      titre,
      description: description || null,
      domaine: domaine || null,
      statut: statut || 'annonce',
      budget: budget || null,
      source: source || null,
      dateDebut: dateDebut || null,
      dateFin: dateFin || null,
      scope,
      location: location.toLowerCase(),
    });
    res.json({ success: true, projet });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/projets/:id', authenticate, async (req, res) => {
  try {
    if (!isJournalistOrAdmin(req.user))
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    const { statut, description } = req.body;
    const updates = {};
    if (statut) updates.statut = statut;
    if (description !== undefined) updates.description = description;
    await DevProjet.update(updates, { where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/projets/:id', authenticate, async (req, res) => {
  try {
    if (!isJournalistOrAdmin(req.user))
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    await DevProjet.destroy({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── SIGNALEMENTS CITOYENS ──────────────────────────────────────────────────

router.get('/signalements', authenticate, async (req, res) => {
  try {
    const { scope, location } = req.query;
    if (!scope || !location)
      return res.status(400).json({ success: false, message: 'scope et location requis' });
    const where = { scope, location: location.toLowerCase() };
    // Citoyens ordinaires ne voient que les signalements publiés
    if (!isJournalistOrAdmin(req.user)) where.statut = 'publie';
    const signalements = await DevSignalement.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: 50
    });
    res.json({ success: true, signalements });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/signalements', authenticate, async (req, res) => {
  try {
    const { type, description, lieu, scope, location } = req.body;
    if (!description || !scope || !location)
      return res.status(400).json({ success: false, message: 'Description, scope et location requis' });
    const signalement = await DevSignalement.create({
      numeroH: req.user.numeroH,
      type: type || 'autre',
      description,
      lieu: lieu || null,
      statut: 'recu',
      scope,
      location: location.toLowerCase(),
    });
    res.json({ success: true, signalement });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/signalements/:id/statut', authenticate, async (req, res) => {
  try {
    if (!isJournalistOrAdmin(req.user))
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    const { statut } = req.body;
    await DevSignalement.update({ statut }, { where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
