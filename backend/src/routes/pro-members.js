import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { sequelize } from '../config/database.js';
import Notification from '../models/Notification.js';

const router = express.Router();

function isAdminUser(req) {
  return !!(req.user?.isMasterAdmin || req.user?.role === 'admin' || req.user?.role === 'super-admin');
}

// ─── MIDDLEWARE PROPRIÉTAIRE ──────────────────────────────────────────────────

async function verifyOwner(req, res, next) {
  try {
    const [account] = await sequelize.query(
      `SELECT id, name, type, owner_numero_h FROM professional_accounts WHERE id=:id LIMIT 1`,
      { replacements: { id: req.params.proAccountId }, type: sequelize.QueryTypes.SELECT }
    );
    if (!account) return res.status(404).json({ success: false, message: 'Compte professionnel introuvable.' });
    if (!isAdminUser(req) && account.owner_numero_h !== req.userId) {
      return res.status(403).json({ success: false, message: 'Accès refusé à cet espace.' });
    }
    req.proAccount = account;
    next();
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}

// ─── MES ÉTABLISSEMENTS LIÉS (utilisateur courant) ────────────────────────────

router.get('/my-memberships', authenticate, async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT m.id, m.role, m.created_at, p.id as professional_account_id, p.name, p.type, p.photo
       FROM professional_account_members m
       JOIN professional_accounts p ON p.id = m.professional_account_id
       WHERE m.numero_h = :n AND m.is_active = true
       ORDER BY m.created_at DESC`,
      { replacements: { n: req.userId }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, memberships: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── MEMBRES D'UN COMPTE PRO (par numéroH) ────────────────────────────────────

router.get('/:proAccountId/members', authenticate, verifyOwner, async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT m.*, u.prenom, u.nom, u.photo
       FROM professional_account_members m
       LEFT JOIN users u ON m.numero_h = u."numeroH"
       WHERE m.professional_account_id = :id AND m.is_active = true
       ORDER BY m.created_at DESC`,
      { replacements: { id: req.params.proAccountId }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, members: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:proAccountId/members', authenticate, verifyOwner, async (req, res) => {
  try {
    const { numeroH, role } = req.body;
    const id = req.params.proAccountId;
    const [user] = await sequelize.query(
      `SELECT "numeroH", prenom, nom FROM users WHERE "numeroH"=:n LIMIT 1`,
      { replacements: { n: numeroH }, type: sequelize.QueryTypes.SELECT }
    );
    if (!user) return res.status(404).json({ success: false, message: `Aucun utilisateur avec le numéroH : ${numeroH}` });
    const nom_display = `${user.prenom} ${user.nom}`;
    const finalRole = role || 'client';
    const [rows] = await sequelize.query(
      `INSERT INTO professional_account_members (professional_account_id, numero_h, role, nom_display, added_by)
       VALUES (:id, :n, :role, :nom, :by)
       ON CONFLICT (professional_account_id, numero_h) DO UPDATE SET role=EXCLUDED.role, nom_display=EXCLUDED.nom_display, is_active=true
       RETURNING *`,
      { replacements: { id, n: numeroH, role: finalRole, nom: nom_display, by: req.userId }, type: sequelize.QueryTypes.INSERT }
    );
    await Notification.createNotification({
      recipientNumeroH: numeroH,
      type: 'pro_member_added',
      title: 'Nouvel accès accordé',
      message: `Vous avez été ajouté(e) à "${req.proAccount.name}" (rôle : ${finalRole}). Vous pouvez la retrouver dans "Mes établissements liés" sur votre profil.`,
      relatedId: id
    }).catch(() => {});
    res.json({ success: true, member: rows[0], user: { prenom: user.prenom, nom: user.nom } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:proAccountId/members/:id', authenticate, async (req, res) => {
  try {
    const { proAccountId, id } = req.params;
    const [member] = await sequelize.query(
      `SELECT * FROM professional_account_members WHERE id=:id AND professional_account_id=:pid LIMIT 1`,
      { replacements: { id, pid: proAccountId }, type: sequelize.QueryTypes.SELECT }
    );
    if (!member) return res.status(404).json({ success: false, message: 'Membre introuvable.' });

    const [account] = await sequelize.query(
      `SELECT owner_numero_h FROM professional_accounts WHERE id=:id LIMIT 1`,
      { replacements: { id: proAccountId }, type: sequelize.QueryTypes.SELECT }
    );
    const isOwner = account && account.owner_numero_h === req.userId;
    const isSelf = member.numero_h === req.userId;
    if (!isOwner && !isSelf && !isAdminUser(req)) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }

    await sequelize.query(
      `UPDATE professional_account_members SET is_active=false WHERE id=:id`,
      { replacements: { id } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;
