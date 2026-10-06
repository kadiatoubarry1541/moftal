import express from 'express';
import { Op } from 'sequelize';
import { authenticate } from '../middleware/auth.js';
import { sequelize } from '../config/database.js';
import Friend from '../models/Friend.js';
import CoupleLink from '../models/CoupleLink.js';
import ParentChildLink from '../models/ParentChildLink.js';
import ResidenceGroup from '../models/ResidenceGroup.js';
import ActivityGroup from '../models/ActivityGroup.js';

// Messages non lus du bouton 💬 : pour chaque conversation de la personne
// (ami, couple, parent/enfant, famille principale, quartier, activité), le
// nombre de messages reçus depuis sa dernière lecture. La date de lecture est
// enregistrée en base (message_reads), jamais seulement dans le téléphone.

const router = express.Router();
router.use(authenticate);

let tableReady = null;
function ensureReadsTable() {
  if (!tableReady) {
    tableReady = sequelize.query(`
      CREATE TABLE IF NOT EXISTS message_reads (
        numero_h     VARCHAR(255) NOT NULL,
        conv_key     VARCHAR(300) NOT NULL,
        last_read_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        PRIMARY KEY (numero_h, conv_key)
      )`).catch((err) => { tableReady = null; throw err; });
  }
  return tableReady;
}

const KEY_RE = /^(friend|couple|pc|family|residence|activity):[^\s]{0,250}$/;

function normalizeLoc(str) {
  if (!str) return '';
  return String(str).trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Toutes les conversations du bouton 💬 pour cette personne. */
async function mesConversations(user) {
  const me = user.numeroH;
  const [amis, couples, liensPC] = await Promise.all([
    Friend.findAll({ where: { [Op.or]: [{ userNumeroH: me }, { friendNumeroH: me }], status: 'accepted' }, attributes: ['id'] }),
    CoupleLink.findAll({
      where: { [Op.or]: [{ husbandNumeroH: me }, { wifeNumeroH: me }], status: 'active', isActive: true, isArchived: false },
      attributes: ['id']
    }),
    ParentChildLink.findAll({
      where: { [Op.or]: [{ parentNumeroH: me }, { childNumeroH: me }], status: 'active', isActive: true },
      attributes: ['id']
    })
  ]);

  // Quartiers (lieux de résidence 1, 2, 3) — même règle que Terre ADAM
  const lieux = [...new Set([user.lieu1, user.lieu2, user.lieu3].map(normalizeLoc).filter(Boolean))];
  const quartiers = lieux.length
    ? await ResidenceGroup.findAll({ where: { location: { [Op.in]: lieux }, isActive: true }, attributes: ['id'] })
    : [];

  // Activités 1, 2, 3 — le groupe du pays de la personne, sinon le groupe global
  const activites = [...new Set([user.activite1, user.activite2, user.activite3].filter(Boolean))];
  const groupesActivite = [];
  for (const activity of activites) {
    const groupes = await ActivityGroup.findAll({ where: { activity, isActive: true }, attributes: ['id', 'pays'], order: [['created_at', 'DESC']] });
    const g = groupes.find((x) => (x.pays || '') === (user.pays || '')) || groupes.find((x) => !x.pays) || null;
    if (g) groupesActivite.push(g.id);
  }

  return {
    friend: amis.map((f) => String(f.id)),
    couple: couples.map((c) => String(c.id)),
    pc: liensPC.map((l) => String(l.id)),
    residence: quartiers.map((q) => String(q.id)),
    activity: groupesActivite.map(String),
    familyName: user.nomFamille || null
  };
}

// Messages reçus après la dernière lecture. Dans une conversation à deux,
// répondre vaut lecture : on compte après la plus récente des deux.
async function compterTete(table, type, ids, me) {
  if (!ids.length) return {};
  const rows = await sequelize.query(
    `SELECT m.link_id::text AS id, COUNT(*)::int AS n
     FROM ${table} m
     LEFT JOIN message_reads r ON r.numero_h = :me AND r.conv_key = :type || ':' || m.link_id::text
     WHERE m.link_id::text IN (:ids) AND m.numero_h <> :me
       AND m.created_at > GREATEST(
         r.last_read_at,
         (SELECT MAX(x.created_at) FROM ${table} x WHERE x.link_id = m.link_id AND x.numero_h = :me),
         'epoch'::timestamptz)
     GROUP BY m.link_id`,
    { replacements: { me, ids, type }, type: 'SELECT' }
  );
  return Object.fromEntries(rows.map((r) => [`${type}:${r.id}`, r.n]));
}

// Groupes : le comptage commence à la première visite (pas de « 999 » d'un coup).
async function compterGroupes(table, type, ids, me) {
  if (!ids.length) return {};
  await sequelize.query(
    `INSERT INTO message_reads (numero_h, conv_key, last_read_at)
     SELECT :me, :type || ':' || id, NOW() FROM unnest(ARRAY[:ids]::text[]) AS id
     ON CONFLICT (numero_h, conv_key) DO NOTHING`,
    { replacements: { me, ids, type } }
  );
  const rows = await sequelize.query(
    `SELECT m.group_id::text AS id, COUNT(*)::int AS n
     FROM ${table} m
     JOIN message_reads r ON r.numero_h = :me AND r.conv_key = :type || ':' || m.group_id::text
     WHERE m.group_id::text IN (:ids) AND m.numero_h <> :me
       AND COALESCE(m.is_deleted, false) = false AND m.created_at > r.last_read_at
     GROUP BY m.group_id`,
    { replacements: { me, ids, type }, type: 'SELECT' }
  );
  return Object.fromEntries(rows.map((r) => [`${type}:${r.id}`, r.n]));
}

async function compterFamille(familyName, me) {
  if (!familyName) return {};
  await sequelize.query(
    `INSERT INTO message_reads (numero_h, conv_key, last_read_at) VALUES (:me, 'family:', NOW())
     ON CONFLICT (numero_h, conv_key) DO NOTHING`,
    { replacements: { me } }
  );
  const [row] = await sequelize.query(
    `SELECT COUNT(*)::int AS n FROM family_tree_messages m
     JOIN message_reads r ON r.numero_h = :me AND r.conv_key = 'family:'
     WHERE m.family_name = :familyName AND m.numero_h <> :me
       AND COALESCE(m.is_active, true) = true AND COALESCE(m.is_deleted, false) = false
       AND m.created_at > r.last_read_at`,
    { replacements: { me, familyName }, type: 'SELECT' }
  );
  return row?.n ? { 'family:': row.n } : {};
}

// ─── GET /api/unread → { total, conversations: { "friend:<id>": 2, … } } ─────
router.get('/', async (req, res) => {
  try {
    await ensureReadsTable();
    const me = req.user.numeroH;
    const c = await mesConversations(req.user);
    const parts = await Promise.all([
      compterTete('friend_messages', 'friend', c.friend, me),
      compterTete('couple_messages', 'couple', c.couple, me),
      compterTete('parent_child_messages', 'pc', c.pc, me),
      compterGroupes('residence_messages', 'residence', c.residence, me),
      compterGroupes('activity_messages', 'activity', c.activity, me),
      compterFamille(c.familyName, me)
    ].map((p) => p.catch((err) => { console.warn('⚠️ unread:', err.message); return {}; })));
    const conversations = Object.assign({}, ...parts);
    const total = Object.values(conversations).reduce((s, n) => s + n, 0);
    res.json({ success: true, total, conversations });
  } catch (error) {
    console.error('Erreur /unread:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ─── POST /api/unread/read { key } → conversation lue maintenant ────────────
router.post('/read', async (req, res) => {
  try {
    const key = String(req.body?.key || '');
    if (!KEY_RE.test(key)) return res.status(400).json({ success: false, message: 'Conversation invalide' });
    await ensureReadsTable();
    await sequelize.query(
      `INSERT INTO message_reads (numero_h, conv_key, last_read_at) VALUES (:me, :key, NOW())
       ON CONFLICT (numero_h, conv_key) DO UPDATE SET last_read_at = NOW()`,
      { replacements: { me: req.user.numeroH, key } }
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur /unread/read:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

export default router;
