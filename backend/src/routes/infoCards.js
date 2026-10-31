import express from 'express';
import { randomUUID } from 'crypto';
import { QueryTypes } from 'sequelize';
import { authenticate } from '../middleware/auth.js';
import { sequelize } from '../config/database.js';
import { enregistrerEnBase } from '../services/fichiersBase.js';

// Cartes d'information d'Info Moftal (mariage, baptême, décès, réunion…) :
// enregistrées en base pour leur auteur. La première carte est gratuite ; les
// suivantes coûtent 2 points, débités dans la même transaction que la carte
// (jamais de points perdus sans carte, ni de carte sans paiement).

const router = express.Router();
router.use(authenticate);

const PRIX_POINTS = 2;
// Vidéo de 30 s ou photo en haute qualité : quelques Mo au plus
const TAILLE_MAX_MEDIA = 20 * 1024 * 1024;

let tablePrete = null;
function ensureTable() {
  if (!tablePrete) {
    tablePrete = sequelize.query(`
      CREATE TABLE IF NOT EXISTS info_cards (
        id UUID PRIMARY KEY,
        numero_h VARCHAR(80) NOT NULL,
        type VARCHAR(40) NOT NULL,
        carte JSONB NOT NULL,
        gratuite BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        -- Une carte supprimée reste comptée : la carte gratuite ne revient pas
        deleted_at TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS info_cards_numero_h ON info_cards (numero_h);
    `).catch((e) => { tablePrete = null; throw e; });
  }
  return tablePrete;
}

// Photos, vidéos et messages vocaux arrivent en « data:…;base64,… » :
// chacun est enregistré dans la table fichiers et remplacé par son adresse.
async function enregistrerMedias(carte, numeroH) {
  const sortie = {};
  for (const [cle, valeur] of Object.entries(carte || {})) {
    const m = typeof valeur === 'string' && valeur.match(/^data:((?:image|video|audio)\/[\w.+-]+)(?:;[^,]*)?;base64,(.+)$/);
    sortie[cle] = m
      ? await enregistrerEnBase(
          { buffer: Buffer.from(m[2], 'base64'), mimetype: m[1], originalname: `${cle}.${m[1].split('/')[1]}` },
          { proprietaire: numeroH, usage: 'info-carte', tailleMax: TAILLE_MAX_MEDIA }
        )
      : valeur;
  }
  return sortie;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const enLigne = (r) => ({ id: r.id, type: r.type, card: r.carte, savedAt: new Date(r.created_at).getTime() });

// GET /api/info-cards/mine — mes cartes, et si la carte gratuite est encore disponible
router.get('/mine', async (req, res) => {
  try {
    await ensureTable();
    const numeroH = req.user.numeroH;
    const rows = await sequelize.query(
      `SELECT * FROM info_cards WHERE numero_h = :numeroH AND deleted_at IS NULL ORDER BY created_at`,
      { replacements: { numeroH }, type: QueryTypes.SELECT }
    );
    const [{ n }] = await sequelize.query(
      `SELECT COUNT(*)::int AS n FROM info_cards WHERE numero_h = :numeroH`,
      { replacements: { numeroH }, type: QueryTypes.SELECT }
    );
    res.json({ success: true, cards: rows.map(enLigne), carteGratuiteDisponible: n === 0 });
  } catch (e) {
    console.error('info-cards/mine:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/info-cards — nouvelle carte (gratuite la première fois, sinon 2 points)
router.post('/', async (req, res) => {
  const { type, card } = req.body || {};
  if (!type || !card || typeof card !== 'object') return res.status(400).json({ success: false, message: 'Carte incomplète.' });
  const numeroH = req.user.numeroH;
  try {
    await ensureTable();
    const carte = await enregistrerMedias(card, numeroH);
    const resultat = await sequelize.transaction(async (transaction) => {
      // Deux envois en même temps ne peuvent pas obtenir deux cartes gratuites
      await sequelize.query(`SELECT pg_advisory_xact_lock(hashtext('info_cards:' || :numeroH))`, { replacements: { numeroH }, transaction });
      const [{ n }] = await sequelize.query(
        `SELECT COUNT(*)::int AS n FROM info_cards WHERE numero_h = :numeroH`,
        { replacements: { numeroH }, type: QueryTypes.SELECT, transaction }
      );
      const gratuite = n === 0;
      let pointsRestants = null;
      if (!gratuite) {
        const [debit] = await sequelize.query(
          `UPDATE gallery_points SET points_disponibles = points_disponibles - :prix, updated_at = NOW()
           WHERE numero_h = :numeroH AND points_disponibles >= :prix RETURNING points_disponibles`,
          { replacements: { numeroH, prix: PRIX_POINTS }, transaction }
        );
        if (!debit || debit.length === 0) return { refus: true };
        pointsRestants = debit[0].points_disponibles;
      }
      const [ligne] = await sequelize.query(
        `INSERT INTO info_cards (id, numero_h, type, carte, gratuite) VALUES (:id, :numeroH, :type, CAST(:carte AS JSONB), :gratuite) RETURNING *`,
        { replacements: { id: randomUUID(), numeroH, type: String(type), carte: JSON.stringify(carte), gratuite }, type: QueryTypes.SELECT, transaction }
      );
      return { ligne, gratuite, pointsRestants };
    });
    if (resultat.refus) {
      return res.status(402).json({ success: false, message: 'Points insuffisants. Achetez des points pour créer cette carte.' });
    }
    res.status(201).json({ success: true, card: enLigne(resultat.ligne), gratuite: resultat.gratuite, pointsRestants: resultat.pointsRestants });
  } catch (e) {
    console.error('info-cards POST:', e);
    res.status(500).json({ success: false, message: e.message?.startsWith('Fichier trop lourd') ? e.message : 'Erreur serveur' });
  }
});

// PUT /api/info-cards/:id — modifier une de mes cartes (sans coût)
router.put('/:id', async (req, res) => {
  if (!UUID_RE.test(req.params.id)) return res.status(404).json({ success: false, message: 'Carte introuvable.' });
  const { type, card } = req.body || {};
  if (!type || !card || typeof card !== 'object') return res.status(400).json({ success: false, message: 'Carte incomplète.' });
  try {
    await ensureTable();
    const carte = await enregistrerMedias(card, req.user.numeroH);
    const rows = await sequelize.query(
      `UPDATE info_cards SET type = :type, carte = CAST(:carte AS JSONB), updated_at = NOW()
       WHERE id = :id AND numero_h = :numeroH AND deleted_at IS NULL RETURNING *`,
      { replacements: { id: req.params.id, numeroH: req.user.numeroH, type: String(type), carte: JSON.stringify(carte) }, type: QueryTypes.SELECT }
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Carte introuvable.' });
    res.json({ success: true, card: enLigne(rows[0]) });
  } catch (e) {
    console.error('info-cards PUT:', e);
    res.status(500).json({ success: false, message: e.message?.startsWith('Fichier trop lourd') ? e.message : 'Erreur serveur' });
  }
});

// DELETE /api/info-cards/:id — retirer une de mes cartes
router.delete('/:id', async (req, res) => {
  if (!UUID_RE.test(req.params.id)) return res.status(404).json({ success: false, message: 'Carte introuvable.' });
  try {
    await ensureTable();
    const rows = await sequelize.query(
      `UPDATE info_cards SET deleted_at = NOW() WHERE id = :id AND numero_h = :numeroH AND deleted_at IS NULL RETURNING id`,
      { replacements: { id: req.params.id, numeroH: req.user.numeroH }, type: QueryTypes.SELECT }
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Carte introuvable.' });
    res.json({ success: true });
  } catch (e) {
    console.error('info-cards DELETE:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

export default router;
