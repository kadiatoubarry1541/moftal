import express from 'express';
import multer from 'multer';
import { authenticate, estAdminUtilisateur } from '../middleware/auth.js';
import { sequelize } from '../config/database.js';
import { notifier } from '../utils/notifier.js';
import DeveloppementDon from '../models/DeveloppementDon.js';
import DevActualite from '../models/DevActualite.js';
import DevActualitePartage from '../models/DevActualitePartage.js';
import DevProjet from '../models/DevProjet.js';
import DevSignalement from '../models/DevSignalement.js';
import DevPublisher from '../models/DevPublisher.js';
import LocationLogo from '../models/LocationLogo.js';
import { uploadToImageKit } from '../services/imagekitStorage.js';
import { uploadToIDrive } from '../services/idriveStorage.js';

const router = express.Router();

// Upload en mémoire — jamais sur le disque du serveur (effacé à chaque
// redémarrage/redéploiement) — puis envoyé vers le stockage cloud.
const uploadLogo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images sont autorisées pour le logo'), false);
    }
  }
});

// Média des actualités : photo ou courte vidéo (la durée max de 5s est vérifiée
// côté client avant l'envoi — 20MB couvre largement une vidéo de 5 secondes).
const uploadActuMedia = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max : une vidéo d'1 minute filmée au téléphone
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images et vidéos sont autorisées'), false);
    }
  }
});

const isJournalistOrAdmin = (user) =>
  user.isMasterAdmin ||
  user.role === 'admin' ||
  user.role === 'super-admin' ||
  user.role === 'journalist' ||
  user.isJournalist === true;

const isAdminOnly = (user) =>
  user.isMasterAdmin || user.role === 'admin' || user.role === 'super-admin';

/** Journalistes/admins peuvent toujours publier — les autres seulement si
 *  l'admin les a explicitement autorisés pour ce lieu précis (chef de
 *  quartier, correspondant local...). */
async function canPublishActualite(user, scope, location) {
  if (isJournalistOrAdmin(user)) return true;
  const grant = await DevPublisher.findOne({
    where: { numeroH: user.numeroH, scope, location: (location || '').toLowerCase() }
  });
  return !!grant;
}

// ─── COTISATIONS (quartier + sous-préfecture uniquement) ────────────────────
// Table créée si besoin, avec le statut de paiement : un don ne compte dans les
// totaux qu'une fois PAYÉ (avant, une simple promesse était comptée comme versée).
let tableDonsPrete = null;
function preparerTableDons() {
  if (!tableDonsPrete) {
    tableDonsPrete = DeveloppementDon.sequelize.query(`
      CREATE TABLE IF NOT EXISTS developpement_dons (
        id UUID PRIMARY KEY, numero_h VARCHAR(255) NOT NULL, amount DECIMAL(15,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'FG', domaine VARCHAR(50) DEFAULT 'general', domaine_label VARCHAR(100),
        message TEXT, scope VARCHAR(30) NOT NULL, location VARCHAR(100) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE developpement_dons ADD COLUMN IF NOT EXISTS statut VARCHAR(20) NOT NULL DEFAULT 'en_attente';
      ALTER TABLE developpement_dons ADD COLUMN IF NOT EXISTS paye_le TIMESTAMPTZ;
    `).catch((e) => { tableDonsPrete = null; throw e; });
  }
  return tableDonsPrete;
}

router.get('/stats', authenticate, async (req, res) => {
  try {
    await preparerTableDons();
    const { scope = 'mondial', location = 'mondial' } = req.query;
    const dons = await DeveloppementDon.findAll({ where: { scope, location: location.toLowerCase(), statut: 'paye' } });
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
    await preparerTableDons();
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

// Prépare le don (en attente) ; il est réglé ensuite par paiement Djomy
// (objet « don_developpement », relatedId = id du don, voir payment.js)
router.post('/donate', authenticate, async (req, res) => {
  try {
    await preparerTableDons();
    const { domaine, domaineLabel, message } = req.body;
    const montant = Math.round(Number(req.body?.amount));
    if (!Number.isFinite(montant) || montant < 1000)
      return res.status(400).json({ success: false, message: 'Montant minimum : 1 000 GNF.' });
    // Sans lieu précisé : le fonds général (le même que les totaux affichés par défaut)
    const scope = String(req.body?.scope || 'mondial').slice(0, 30);
    const location = String(req.body?.location || 'mondial').toLowerCase().slice(0, 100);
    const don = await DeveloppementDon.create({
      numeroH: req.user.numeroH,
      amount: montant,
      currency: 'GNF',
      domaine: domaine || 'general',
      domaineLabel: domaineLabel || 'Fonds Général',
      message: message || null,
      scope,
      location,
      statut: 'en_attente',
    });
    res.json({ success: true, don, donId: don.id, montant });
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
    const loc = location.toLowerCase();

    // Actualités publiées directement ici + actualités publiées ailleurs mais
    // partagées vers ce niveau (une seule ligne en base, jamais dupliquée).
    const [directes, partages] = await Promise.all([
      DevActualite.findAll({ where: { scope, location: loc } }),
      DevActualitePartage.findAll({ where: { scope, location: loc } }),
    ]);
    const idsPartages = partages.map(p => p.actualiteId);
    const partagees = idsPartages.length
      ? await DevActualite.findAll({ where: { id: idsPartages } })
      : [];

    const vues = new Map();
    for (const a of [...directes, ...partagees]) vues.set(a.id, a);
    const actualites = [...vues.values()]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 50);

    res.json({ success: true, actualites });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/actualites/can-publish', authenticate, async (req, res) => {
  try {
    const { scope, location } = req.query;
    if (!scope || !location)
      return res.status(400).json({ success: false, message: 'scope et location requis' });
    const canPublish = await canPublishActualite(req.user, scope, location);
    res.json({ success: true, canPublish });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/actualites', authenticate, uploadActuMedia.single('media'), async (req, res) => {
  try {
    const { titre, content, domaine, scope, location, partages } = req.body;
    if (!titre || !content || !scope || !location)
      return res.status(400).json({ success: false, message: 'Titre, contenu, scope et location requis' });
    if (!(await canPublishActualite(req.user, scope, location)))
      return res.status(403).json({ success: false, message: 'Vous n\'êtes pas autorisé à publier ici. Demandez l\'autorisation à un administrateur.' });

    let mediaUrl = null;
    let mediaType = 'text';
    if (req.file) {
      mediaUrl = await uploadToImageKit(req.file.buffer, req.file.originalname, 'developpement-actualites');
      uploadToIDrive(req.file.buffer, req.file.originalname, req.file.mimetype, 'developpement-actualites').catch(() => {});
      mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
    }

    const actu = await DevActualite.create({
      numeroH: req.user.numeroH,
      authorName: `${req.user.prenom || ''} ${req.user.nomFamille || ''}`.trim() || req.user.numeroH,
      titre,
      content,
      mediaUrl,
      mediaType,
      domaine: domaine || null,
      scope,
      location: location.toLowerCase(),
    });

    // Faire remonter la même actualité (pas de copie) vers d'autres niveaux —
    // seulement ceux où l'auteur a réellement le droit de publier. On ne fait
    // jamais confiance à la liste envoyée par le client sans la revérifier.
    let partagesCrees = [];
    if (partages) {
      let demandes = [];
      try { demandes = JSON.parse(partages); } catch { demandes = []; }
      if (Array.isArray(demandes)) {
        demandes = demandes.slice(0, 10); // limite raisonnable
        for (const p of demandes) {
          const pScope = p?.scope;
          const pLocation = p?.location;
          if (!pScope || !pLocation) continue;
          if (pScope === scope && pLocation.toLowerCase() === location.toLowerCase()) continue;
          if (!(await canPublishActualite(req.user, pScope, pLocation))) continue;
          partagesCrees.push(
            await DevActualitePartage.create({
              actualiteId: actu.id,
              scope: pScope,
              location: pLocation.toLowerCase(),
              partageBy: req.user.numeroH,
            })
          );
        }
      }
    }

    res.json({ success: true, actualite: actu, partages: partagesCrees });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/actualites/:id', authenticate, async (req, res) => {
  try {
    const actu = await DevActualite.findByPk(req.params.id);
    if (!actu) return res.status(404).json({ success: false, message: 'Actualité introuvable' });
    const estAuteur = actu.numeroH === req.user.numeroH;
    if (!estAuteur && !isJournalistOrAdmin(req.user))
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    await DevActualitePartage.destroy({ where: { actualiteId: actu.id } });
    await actu.destroy();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUBLICATEURS LOCAUX AUTORISÉS (chefs, correspondants...) ──────────────
// Gérés uniquement par l'admin — un journaliste ne peut pas s'auto-autoriser
// ni autoriser quelqu'un d'autre.

router.get('/publishers', authenticate, async (req, res) => {
  try {
    if (!isAdminOnly(req.user))
      return res.status(403).json({ success: false, message: 'Réservé aux administrateurs' });
    const { scope, location } = req.query;
    if (!scope || !location)
      return res.status(400).json({ success: false, message: 'scope et location requis' });
    const publishers = await DevPublisher.findAll({
      where: { scope, location: location.toLowerCase() },
      order: [['created_at', 'DESC']]
    });
    res.json({ success: true, publishers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/publishers', authenticate, async (req, res) => {
  try {
    if (!isAdminOnly(req.user))
      return res.status(403).json({ success: false, message: 'Réservé aux administrateurs' });
    const { numeroH, name, role, scope, location } = req.body;
    if (!numeroH || !scope || !location)
      return res.status(400).json({ success: false, message: 'NuméroH, scope et location requis' });
    const publisher = await DevPublisher.create({
      numeroH: numeroH.trim(),
      name: name || null,
      role: role || null,
      scope,
      location: location.toLowerCase(),
      addedBy: req.user.numeroH,
    });
    res.json({ success: true, publisher });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/publishers/:id', authenticate, async (req, res) => {
  try {
    if (!isAdminOnly(req.user))
      return res.status(403).json({ success: false, message: 'Réservé aux administrateurs' });
    await DevPublisher.destroy({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PROPOSITIONS DE PROJETS (citoyens) ─────────────────────────────────────
// Toute personne connectée propose un projet dans un domaine ; il est enregistré
// en base « en attente », et n'apparaît sur la page qu'une fois approuvé par
// l'administrateur. L'auteur voit ses propres propositions et leur décision.

const DOMAINES_DEV = ['agriculture', 'habitat', 'energie', 'education', 'sante', 'numerique', 'commerce',
  'infrastructure', 'environnement', 'femmes', 'jeunesse', 'gouvernance'];
const MAX_EN_ATTENTE = 5;
let tablePropositionsPrete = null;
function preparerTablePropositions() {
  if (!tablePropositionsPrete) {
    tablePropositionsPrete = sequelize.query(`
      CREATE TABLE IF NOT EXISTS dev_propositions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        auteur_numero_h VARCHAR(80) NOT NULL,
        auteur_nom VARCHAR(200),
        domaine VARCHAR(40) NOT NULL,
        titre VARCHAR(150) NOT NULL,
        description TEXT NOT NULL,
        lieu VARCHAR(150),
        statut VARCHAR(20) NOT NULL DEFAULT 'en_attente',
        motif_refus TEXT,
        decide_par VARCHAR(80),
        decide_le TIMESTAMPTZ,
        cree_le TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`).catch((e) => { tablePropositionsPrete = null; throw e; });
  }
  return tablePropositionsPrete;
}
const q = (sql, replacements = {}) => sequelize.query(sql, { replacements, type: 'SELECT' });
const versClient = (p) => ({
  id: p.id, domaine: p.domaine, titre: p.titre, description: p.description, lieu: p.lieu,
  statut: p.statut, motifRefus: p.motif_refus, auteurNom: p.auteur_nom,
  creeLe: p.cree_le, decideLe: p.decide_le,
});

// Proposer un projet
router.post('/propositions', authenticate, async (req, res) => {
  try {
    const titre = String(req.body?.titre || '').trim();
    const description = String(req.body?.description || '').trim();
    const domaine = String(req.body?.domaine || '');
    const lieu = String(req.body?.lieu || '').trim().slice(0, 150) || null;
    if (!DOMAINES_DEV.includes(domaine)) return res.status(400).json({ success: false, message: 'Choisissez un domaine.' });
    if (titre.length < 5 || titre.length > 150) return res.status(400).json({ success: false, message: 'Le titre doit faire entre 5 et 150 caractères.' });
    if (description.length < 20 || description.length > 5000) {
      return res.status(400).json({ success: false, message: 'Décrivez votre projet en 20 caractères au moins (5 000 au plus).' });
    }
    await preparerTablePropositions();
    const [{ n }] = await q(`SELECT COUNT(*)::int AS n FROM dev_propositions WHERE auteur_numero_h = :nh AND statut = 'en_attente'`, { nh: req.user.numeroH });
    if (n >= MAX_EN_ATTENTE) {
      return res.status(429).json({ success: false, message: `Vous avez déjà ${MAX_EN_ATTENTE} propositions en attente : attendez la décision de l'administrateur.` });
    }
    const auteurNom = `${req.user.prenom || ''} ${req.user.nomFamille || ''}`.trim() || null;
    const [proposition] = await q(
      `INSERT INTO dev_propositions (auteur_numero_h, auteur_nom, domaine, titre, description, lieu)
       VALUES (:nh, :auteurNom, :domaine, :titre, :description, :lieu) RETURNING *`,
      { nh: req.user.numeroH, auteurNom, domaine, titre, description, lieu }
    );
    res.status(201).json({ success: true, message: "Merci ! Votre projet sera examiné par l'administrateur.", proposition: versClient(proposition) });
  } catch (err) {
    console.error('dev/propositions POST:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// Projets approuvés (et terminés) d'un domaine, plus mes propres propositions
router.get('/propositions', authenticate, async (req, res) => {
  try {
    await preparerTablePropositions();
    const domaine = req.query.domaine ? String(req.query.domaine) : null;
    const filtre = domaine ? 'AND domaine = :domaine' : '';
    const publics = await q(
      `SELECT * FROM dev_propositions WHERE statut IN ('approuve', 'termine') ${filtre} ORDER BY decide_le DESC NULLS LAST LIMIT 200`, { domaine });
    const miennes = await q(
      `SELECT * FROM dev_propositions WHERE auteur_numero_h = :nh ${filtre} ORDER BY cree_le DESC LIMIT 50`, { nh: req.user.numeroH, domaine });
    const [stats] = await q(`SELECT
        COUNT(*) FILTER (WHERE statut = 'approuve')::int AS en_cours,
        COUNT(*) FILTER (WHERE statut = 'termine')::int AS termines,
        COUNT(*)::int AS idees
      FROM dev_propositions`);
    res.json({
      success: true,
      projets: publics.map(versClient),
      mesPropositions: miennes.map(versClient),
      stats: { enCours: stats.en_cours, termines: stats.termines, idees: stats.idees },
    });
  } catch (err) {
    console.error('dev/propositions GET:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// Administrateur : propositions à examiner
router.get('/propositions/a-examiner', authenticate, async (req, res) => {
  try {
    if (!estAdminUtilisateur(req.user)) return res.status(403).json({ success: false, message: 'Réservé à l\'administrateur.' });
    await preparerTablePropositions();
    const lignes = await q(`SELECT * FROM dev_propositions WHERE statut = 'en_attente' ORDER BY cree_le ASC LIMIT 200`);
    res.json({ success: true, propositions: lignes.map(versClient) });
  } catch (err) {
    console.error('dev/propositions a-examiner:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// Administrateur : approuver, refuser (avec motif) ou marquer un projet terminé
router.patch('/propositions/:id/decision', authenticate, async (req, res) => {
  try {
    if (!estAdminUtilisateur(req.user)) return res.status(403).json({ success: false, message: 'Réservé à l\'administrateur.' });
    const decision = String(req.body?.decision || '');
    const motif = String(req.body?.motif || '').trim().slice(0, 1000) || null;
    const transitions = { approuve: ['en_attente'], refuse: ['en_attente'], termine: ['approuve'] };
    if (!transitions[decision]) return res.status(400).json({ success: false, message: 'Décision inconnue.' });
    if (decision === 'refuse' && !motif) return res.status(400).json({ success: false, message: "Indiquez le motif du refus : l'auteur le verra." });
    if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) return res.status(404).json({ success: false, message: 'Proposition introuvable.' });
    await preparerTablePropositions();
    const [p] = await q(
      `UPDATE dev_propositions SET statut = :decision, motif_refus = :motif, decide_par = :par, decide_le = NOW()
       WHERE id = :id AND statut IN (:avant) RETURNING *`,
      { decision, motif: decision === 'refuse' ? motif : null, par: req.user.numeroH, id: req.params.id, avant: transitions[decision] }
    );
    if (!p) return res.status(409).json({ success: false, message: 'Cette proposition a déjà été traitée.' });
    const textes = {
      approuve: [`Votre projet « ${p.titre} » a été approuvé : il apparaît maintenant sur la page Développement.`, 'Projet approuvé ✅'],
      refuse: [`Votre projet « ${p.titre} » n'a pas été retenu. Motif : ${motif}`, 'Projet non retenu'],
      termine: [`Votre projet « ${p.titre} » est marqué comme terminé. Merci !`, 'Projet terminé 🎉'],
    }[decision];
    notifier(p.auteur_numero_h, 'developpement', textes[0], textes[1]);
    res.json({ success: true, proposition: versClient(p) });
  } catch (err) {
    console.error('dev/propositions decision:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
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

// ─── LOGO DU LIEU (sous-préfecture, préfecture, région...) ─────────────────
// Pas d'admin local à ces niveaux : réservé aux journalistes/admins, comme
// pour les actualités et projets.

router.get('/logo', authenticate, async (req, res) => {
  try {
    const { scope, location } = req.query;
    if (!scope || !location)
      return res.status(400).json({ success: false, message: 'scope et location requis' });
    const logo = await LocationLogo.findOne({ where: { scope, location: location.toLowerCase() } });
    res.json({ success: true, logoUrl: logo?.logoUrl || null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/logo', authenticate, uploadLogo.single('logo'), async (req, res) => {
  try {
    if (!isJournalistOrAdmin(req.user))
      return res.status(403).json({ success: false, message: 'Réservé aux journalistes et administrateurs' });
    const { scope, location } = req.body;
    if (!scope || !location)
      return res.status(400).json({ success: false, message: 'scope et location requis' });
    if (!req.file)
      return res.status(400).json({ success: false, message: 'Aucune image envoyée' });

    const logoUrl = await uploadToImageKit(req.file.buffer, req.file.originalname, 'developpement');
    uploadToIDrive(req.file.buffer, req.file.originalname, req.file.mimetype, 'developpement').catch(() => {});
    const normalizedLocation = location.toLowerCase();
    const [logo] = await LocationLogo.findOrCreate({
      where: { scope, location: normalizedLocation },
      defaults: { logoUrl, updatedBy: req.user.numeroH }
    });
    if (logo.logoUrl !== logoUrl) {
      await logo.update({ logoUrl, updatedBy: req.user.numeroH });
    }

    res.json({ success: true, message: 'Logo mis à jour', logoUrl });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/logo', authenticate, async (req, res) => {
  try {
    if (!isJournalistOrAdmin(req.user))
      return res.status(403).json({ success: false, message: 'Réservé aux journalistes et administrateurs' });
    const { scope, location } = req.query;
    if (!scope || !location)
      return res.status(400).json({ success: false, message: 'scope et location requis' });
    await LocationLogo.destroy({ where: { scope, location: location.toLowerCase() } });
    res.json({ success: true, message: 'Logo retiré' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
