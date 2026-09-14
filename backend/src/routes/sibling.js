import express from 'express';
import { authenticate } from '../middleware/auth.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { sequelize } from '../config/database.js';

const router = express.Router();
router.use(authenticate);

/**
 * Lien frère/sœur direct entre deux personnes, validé mutuellement — sans
 * passer par un parent commun. Nécessaire quand le parent partagé est
 * décédé (donc ne peut confirmer aucun lien parent-enfant) : les deux
 * frères/sœurs se valident directement entre eux.
 */
async function ensureSiblingLinksTable() {
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "sibling_links" (
        "id"                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        "numero_h1"             VARCHAR(255) NOT NULL,
        "numero_h2"             VARCHAR(255) NOT NULL,
        "initiated_by_numero_h" VARCHAR(255) NOT NULL,
        "status"                VARCHAR(20)  DEFAULT 'pending',
        "confirmed_at"          TIMESTAMPTZ,
        "is_active"             BOOLEAN      DEFAULT true,
        "created_at"            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "updated_at"            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
    `);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_sl_h1 ON "sibling_links" ("numero_h1");`).catch(() => {});
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_sl_h2 ON "sibling_links" ("numero_h2");`).catch(() => {});
  } catch (err) {
    console.warn('⚠️ ensureSiblingLinksTable:', err.message);
  }
}

/** Admin : aucune condition, tout voir et tout gérer. */
const isAdmin = (user) =>
  !!(user && (user.role === 'admin' || user.role === 'super-admin' || user.numeroH === 'G7C7P7R7E7F7 7' || user.bypassRestrictions));

/**
 * POST /api/sibling/link
 * Demande de lien frère/sœur direct. Body: { siblingNumeroH }.
 */
router.post('/link', async (req, res) => {
  try {
    await ensureSiblingLinksTable();
    const user = req.user;
    const { siblingNumeroH } = req.body;

    if (!siblingNumeroH || !String(siblingNumeroH).trim()) {
      return res.status(400).json({ success: false, message: 'Le NumeroH du frère/de la sœur est obligatoire' });
    }
    const targetNumeroH = String(siblingNumeroH).trim();
    if (targetNumeroH === user.numeroH) {
      return res.status(400).json({ success: false, message: 'Vous ne pouvez pas vous lier à vous-même.' });
    }

    const sibling = await User.findByNumeroH(targetNumeroH);
    if (!sibling) {
      return res.status(404).json({ success: false, message: 'Aucun utilisateur trouvé avec ce NumeroH' });
    }

    const [existing] = await sequelize.query(
      `SELECT id, status FROM sibling_links
       WHERE is_active = true AND ((numero_h1 = :a AND numero_h2 = :b) OR (numero_h1 = :b AND numero_h2 = :a))
       LIMIT 1`,
      { replacements: { a: user.numeroH, b: targetNumeroH }, type: sequelize.QueryTypes.SELECT }
    );
    if (existing) {
      return res.status(400).json({
        success: false,
        message: existing.status === 'active' ? 'Vous êtes déjà liés.' : 'Une demande est déjà en attente entre vous deux.'
      });
    }

    const [link] = await sequelize.query(
      `INSERT INTO sibling_links (numero_h1, numero_h2, initiated_by_numero_h, status)
       VALUES (:a, :b, :a, 'pending') RETURNING id, numero_h1, numero_h2, status`,
      { replacements: { a: user.numeroH, b: targetNumeroH }, type: sequelize.QueryTypes.INSERT }
    );

    try {
      const senderName = [user.prenom, user.nomFamille].filter(Boolean).join(' ') || user.numeroH;
      await Notification.createNotification({
        recipientNumeroH: targetNumeroH,
        type: 'sibling_request',
        title: 'Demande de lien frère/sœur',
        message: `${senderName} vous a envoyé une demande de lien frère/sœur.`,
        relatedId: link[0]?.id
      });
    } catch (e) { console.error('Notif sibling_request:', e.message); }

    res.json({
      success: true,
      message: 'Demande envoyée. C\'est à l\'autre personne de confirmer le lien.',
      link: link[0],
      sibling: { numeroH: sibling.numeroH, prenom: sibling.prenom, nomFamille: sibling.nomFamille, photo: sibling.photo, genre: sibling.genre }
    });
  } catch (error) {
    console.error('Erreur création lien frère/sœur:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur lors de la création du lien' });
  }
});

/**
 * GET /api/sibling/pending-invitations
 * Demandes reçues, en attente de ma confirmation.
 */
router.get('/pending-invitations', async (req, res) => {
  try {
    await ensureSiblingLinksTable();
    const user = req.user;
    const links = await sequelize.query(
      `SELECT * FROM sibling_links
       WHERE status = 'pending' AND is_active = true AND initiated_by_numero_h != :me
       AND (numero_h1 = :me OR numero_h2 = :me)
       ORDER BY created_at DESC`,
      { replacements: { me: user.numeroH }, type: sequelize.QueryTypes.SELECT }
    );
    const withSender = await Promise.all(links.map(async (link) => {
      const senderNumeroH = link.initiated_by_numero_h;
      const sender = await User.findOne({ where: { numeroH: senderNumeroH }, attributes: ['numeroH', 'prenom', 'nomFamille', 'photo', 'genre'] });
      return { ...link, sender: sender ? sender.toJSON() : null };
    }));
    res.json({ success: true, invitations: withSender });
  } catch (error) {
    console.error('Erreur invitations frère/sœur:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * POST /api/sibling/confirm/:linkId
 */
router.post('/confirm/:linkId', async (req, res) => {
  try {
    await ensureSiblingLinksTable();
    const user = req.user;
    const { linkId } = req.params;
    const [link] = await sequelize.query(
      `SELECT * FROM sibling_links WHERE id = :id AND is_active = true LIMIT 1`,
      { replacements: { id: linkId }, type: sequelize.QueryTypes.SELECT }
    );
    if (!link) return res.status(404).json({ success: false, message: 'Lien non trouvé' });
    if (link.status !== 'pending') return res.status(400).json({ success: false, message: 'Ce lien n\'est plus en attente' });
    const isDestinataire = link.initiated_by_numero_h !== user.numeroH && (link.numero_h1 === user.numeroH || link.numero_h2 === user.numeroH);
    if (!isDestinataire && !isAdmin(user)) {
      return res.status(403).json({ success: false, message: 'Seul le destinataire peut confirmer ce lien' });
    }
    await sequelize.query(
      `UPDATE sibling_links SET status = 'active', confirmed_at = NOW(), updated_at = NOW() WHERE id = :id`,
      { replacements: { id: linkId } }
    );
    res.json({ success: true, message: 'Lien confirmé. Vous êtes maintenant liés.' });
  } catch (error) {
    console.error('Erreur confirmation lien frère/sœur:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * POST /api/sibling/reject/:linkId
 */
router.post('/reject/:linkId', async (req, res) => {
  try {
    await ensureSiblingLinksTable();
    const user = req.user;
    const { linkId } = req.params;
    const [link] = await sequelize.query(
      `SELECT * FROM sibling_links WHERE id = :id AND is_active = true LIMIT 1`,
      { replacements: { id: linkId }, type: sequelize.QueryTypes.SELECT }
    );
    if (!link) return res.status(404).json({ success: false, message: 'Lien non trouvé' });
    if (link.status !== 'pending') return res.status(400).json({ success: false, message: 'Ce lien n\'est plus en attente' });
    const isDestinataire = link.initiated_by_numero_h !== user.numeroH && (link.numero_h1 === user.numeroH || link.numero_h2 === user.numeroH);
    if (!isDestinataire && !isAdmin(user)) {
      return res.status(403).json({ success: false, message: 'Seul le destinataire peut refuser ce lien' });
    }
    await sequelize.query(`UPDATE sibling_links SET status = 'rejected', updated_at = NOW() WHERE id = :id`, { replacements: { id: linkId } });
    res.json({ success: true, message: 'Lien refusé.' });
  } catch (error) {
    console.error('Erreur rejet lien frère/sœur:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * GET /api/sibling/pending-sent
 */
router.get('/pending-sent', async (req, res) => {
  try {
    await ensureSiblingLinksTable();
    const user = req.user;
    const links = await sequelize.query(
      `SELECT * FROM sibling_links WHERE status = 'pending' AND is_active = true AND initiated_by_numero_h = :me ORDER BY created_at DESC`,
      { replacements: { me: user.numeroH }, type: sequelize.QueryTypes.SELECT }
    );
    const withTarget = await Promise.all(links.map(async (link) => {
      const targetNumeroH = link.numero_h1 === user.numeroH ? link.numero_h2 : link.numero_h1;
      const target = await User.findOne({ where: { numeroH: targetNumeroH }, attributes: ['numeroH', 'prenom', 'nomFamille', 'photo', 'genre'] });
      return { ...link, target: target ? target.toJSON() : null };
    }));
    res.json({ success: true, invitations: withTarget });
  } catch (error) {
    console.error('Erreur demandes envoyées frère/sœur:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * GET /api/sibling/my-siblings
 * Mes frères/sœurs confirmés (liens directs).
 */
router.get('/my-siblings', async (req, res) => {
  try {
    await ensureSiblingLinksTable();
    const user = req.user;
    const links = await sequelize.query(
      `SELECT * FROM sibling_links WHERE status = 'active' AND is_active = true AND (numero_h1 = :me OR numero_h2 = :me) ORDER BY created_at DESC`,
      { replacements: { me: user.numeroH }, type: sequelize.QueryTypes.SELECT }
    );
    const siblings = await Promise.all(links.map(async (link) => {
      const otherNumeroH = link.numero_h1 === user.numeroH ? link.numero_h2 : link.numero_h1;
      const other = await User.findOne({ where: { numeroH: otherNumeroH }, attributes: ['numeroH', 'prenom', 'nomFamille', 'photo', 'genre', 'dateNaissance'] });
      return other ? { ...other.toJSON(), linkId: link.id } : null;
    }));
    res.json({ success: true, siblings: siblings.filter(Boolean) });
  } catch (error) {
    console.error('Erreur récupération frères/sœurs:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * GET /api/sibling/siblings-of/:numeroH
 * Frères/sœurs confirmés d'un NumeroH donné (infos publiques), pour que le
 * reste de la famille (neveux/nièces via ces liens directs, etc.) en profite
 * aussi dans l'arbre — même logique que /parent-child/children-of.
 */
router.get('/siblings-of/:numeroH', async (req, res) => {
  try {
    await ensureSiblingLinksTable();
    const { numeroH } = req.params;
    const links = await sequelize.query(
      `SELECT * FROM sibling_links WHERE status = 'active' AND is_active = true AND (numero_h1 = :n OR numero_h2 = :n) ORDER BY created_at DESC`,
      { replacements: { n: numeroH }, type: sequelize.QueryTypes.SELECT }
    );
    const siblings = await Promise.all(links.map(async (link) => {
      const otherNumeroH = link.numero_h1 === numeroH ? link.numero_h2 : link.numero_h1;
      const other = await User.findOne({ where: { numeroH: otherNumeroH }, attributes: ['numeroH', 'prenom', 'nomFamille', 'photo', 'genre', 'dateNaissance'] });
      return other ? { ...other.toJSON(), linkId: link.id } : null;
    }));
    res.json({ success: true, siblings: siblings.filter(Boolean) });
  } catch (error) {
    console.error('Erreur siblings-of:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/sibling/link/:linkId
 */
router.delete('/link/:linkId', async (req, res) => {
  try {
    await ensureSiblingLinksTable();
    const user = req.user;
    const { linkId } = req.params;
    const [link] = await sequelize.query(
      `SELECT * FROM sibling_links WHERE id = :id LIMIT 1`,
      { replacements: { id: linkId }, type: sequelize.QueryTypes.SELECT }
    );
    if (!link) return res.status(404).json({ success: false, message: 'Lien non trouvé' });
    const belongs = link.numero_h1 === user.numeroH || link.numero_h2 === user.numeroH;
    if (!belongs && !isAdmin(user)) return res.status(403).json({ success: false, message: 'Vous ne faites pas partie de ce lien' });
    await sequelize.query(`UPDATE sibling_links SET is_active = false, updated_at = NOW() WHERE id = :id`, { replacements: { id: linkId } });
    res.json({ success: true, message: 'Lien supprimé.' });
  } catch (error) {
    console.error('Erreur suppression lien frère/sœur:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

export default router;
