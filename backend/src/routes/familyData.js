import express from 'express';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

// Données familiales de l'arbre enregistrées en base (avant : seulement dans
// le téléphone) : invitations entre membres et documents familiaux.

const router = express.Router();
router.use(authenticate);

const RELATION_MAX = 60;
const DOC_TYPES = ['naissance', 'mariage', 'deces', 'militaire', 'recensement', 'photo', 'autre'];

const q = (sql, replacements, type = QueryTypes.SELECT) =>
  sequelize.query(sql, { replacements, type });

const nomDe = (u) => `${u.prenom || ''} ${u.nomFamille || ''}`.trim() || u.numeroH;

const toInvitation = (r) => ({
  id: r.id,
  fromNumeroH: r.from_numero_h,
  fromName: r.from_name,
  fromPhoto: r.from_photo || undefined,
  toNumeroH: r.to_numero_h,
  toName: r.to_name,
  relation: r.relation,
  message: r.message || undefined,
  status: r.status,
  dateSent: r.created_at,
  dateResponded: r.date_responded || undefined,
});

/* ─────────────────────────── INVITATIONS ─────────────────────────── */

// GET /api/family-data/invitations → { received, sent }
router.get('/invitations', async (req, res) => {
  try {
    const me = req.user.numeroH;
    const [received, sent] = await Promise.all([
      q(`SELECT * FROM family_invitations WHERE to_numero_h = :me ORDER BY created_at DESC`, { me }),
      q(`SELECT * FROM family_invitations WHERE from_numero_h = :me ORDER BY created_at DESC`, { me }),
    ]);
    res.json({ success: true, received: received.map(toInvitation), sent: sent.map(toInvitation) });
  } catch (err) {
    console.error('family-data GET invitations:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// POST /api/family-data/invitations { toNumeroH, toName, relation, message?, dateSent?, status? }
router.post('/invitations', async (req, res) => {
  try {
    const me = req.user.numeroH;
    const toNumeroH = String(req.body.toNumeroH || '').trim();
    const relation = String(req.body.relation || '').trim().slice(0, RELATION_MAX);
    if (!toNumeroH || !relation) {
      return res.status(400).json({ success: false, message: 'NuméroH du membre et relation requis.' });
    }
    if (toNumeroH === me) {
      return res.status(400).json({ success: false, message: 'Vous ne pouvez pas vous inviter vous-même.' });
    }
    const [dup] = await q(
      `SELECT * FROM family_invitations WHERE from_numero_h = :me AND to_numero_h = :to AND relation = :relation AND status = 'pending' LIMIT 1`,
      { me, to: toNumeroH, relation }
    );
    if (dup) return res.json({ success: true, invitation: toInvitation(dup) });

    const [row] = await q(
      `INSERT INTO family_invitations (from_numero_h, from_name, from_photo, to_numero_h, to_name, relation, message)
       VALUES (:me, :fromName, :fromPhoto, :to, :toName, :relation, :message)
       RETURNING *`,
      {
        me,
        fromName: nomDe(req.user),
        fromPhoto: req.user.photo || null,
        to: toNumeroH,
        toName: String(req.body.toName || '').trim() || toNumeroH,
        relation,
        message: req.body.message ? String(req.body.message).trim() : null,
      }
    );
    res.status(201).json({ success: true, invitation: toInvitation(row) });
  } catch (err) {
    console.error('family-data POST invitation:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// POST /api/family-data/invitations/:id/respond { action: 'accept' | 'decline' }
router.post('/invitations/:id/respond', async (req, res) => {
  try {
    const status = req.body.action === 'accept' ? 'accepted' : req.body.action === 'decline' ? 'declined' : null;
    if (!status) return res.status(400).json({ success: false, message: 'Action invalide.' });
    const [row] = await q(
      `UPDATE family_invitations
         SET status = :status, date_responded = NOW(), receiver_seen = TRUE, sender_seen = FALSE, updated_at = NOW()
       WHERE id = :id AND to_numero_h = :me AND status = 'pending'
       RETURNING *`,
      { status, id: req.params.id, me: req.user.numeroH }
    );
    // UPDATE … RETURNING avec QueryTypes.SELECT renvoie les lignes
    if (!row) return res.status(404).json({ success: false, message: 'Invitation introuvable ou déjà traitée.' });
    res.json({ success: true, invitation: toInvitation(row) });
  } catch (err) {
    console.error('family-data respond invitation:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// DELETE /api/family-data/invitations/:id — seul l'expéditeur
router.delete('/invitations/:id', async (req, res) => {
  try {
    const rows = await q(
      `DELETE FROM family_invitations WHERE id = :id AND from_numero_h = :me RETURNING id`,
      { id: req.params.id, me: req.user.numeroH }
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Invitation introuvable.' });
    res.json({ success: true });
  } catch (err) {
    console.error('family-data DELETE invitation:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// GET /api/family-data/notifications — déduites des invitations
router.get('/notifications', async (req, res) => {
  try {
    const me = req.user.numeroH;
    const [received, answered] = await Promise.all([
      q(`SELECT * FROM family_invitations WHERE to_numero_h = :me ORDER BY created_at DESC`, { me }),
      q(`SELECT * FROM family_invitations WHERE from_numero_h = :me AND status <> 'pending' ORDER BY date_responded DESC`, { me }),
    ]);
    const notifications = [
      ...received.map((r) => ({
        id: `${r.id}:received`,
        invitationId: r.id,
        type: 'invitation_received',
        fromNumeroH: r.from_numero_h,
        fromName: r.from_name,
        fromPhoto: r.from_photo || undefined,
        message: `${r.from_name} vous invite à rejoindre son site en tant que ${r.relation}`,
        date: r.created_at,
        read: r.receiver_seen,
      })),
      ...answered.map((r) => ({
        id: `${r.id}:answered`,
        invitationId: r.id,
        type: r.status === 'accepted' ? 'invitation_accepted' : 'invitation_declined',
        fromNumeroH: r.to_numero_h,
        fromName: r.to_name,
        message: `${r.to_name} a ${r.status === 'accepted' ? 'accepté' : 'refusé'} votre invitation`,
        date: r.date_responded,
        read: r.sender_seen,
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json({ success: true, notifications });
  } catch (err) {
    console.error('family-data GET notifications:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// POST /api/family-data/notifications/:id/read  (id = "<invitationId>:received|answered")
router.post('/notifications/:id/read', async (req, res) => {
  try {
    const [invitationId, kind] = String(req.params.id).split(':');
    const me = req.user.numeroH;
    if (kind === 'received') {
      await q(`UPDATE family_invitations SET receiver_seen = TRUE WHERE id = :id AND to_numero_h = :me`,
        { id: invitationId, me }, QueryTypes.UPDATE);
    } else if (kind === 'answered') {
      await q(`UPDATE family_invitations SET sender_seen = TRUE WHERE id = :id AND from_numero_h = :me`,
        { id: invitationId, me }, QueryTypes.UPDATE);
    } else {
      return res.status(400).json({ success: false, message: 'Notification invalide.' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('family-data read notification:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

/* ───────────────────────── DOCUMENTS FAMILIAUX ───────────────────────── */

const toDoc = (r) => ({ id: r.id, memberNumeroH: r.member_numero_h, type: r.type, description: r.description, annee: r.annee || undefined });

// GET /api/family-data/documents → { documents: [...] }
router.get('/documents', async (req, res) => {
  try {
    const rows = await q(
      `SELECT * FROM family_documents WHERE owner_numero_h = :me ORDER BY created_at ASC`,
      { me: req.user.numeroH }
    );
    res.json({ success: true, documents: rows.map(toDoc) });
  } catch (err) {
    console.error('family-data GET documents:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// POST /api/family-data/documents { memberNumeroH, type, description, annee? }
router.post('/documents', async (req, res) => {
  try {
    const memberNumeroH = String(req.body.memberNumeroH || '').trim();
    const description = String(req.body.description || '').trim();
    const type = DOC_TYPES.includes(req.body.type) ? req.body.type : 'autre';
    if (!memberNumeroH || !description) {
      return res.status(400).json({ success: false, message: 'Membre et description requis.' });
    }
    const [row] = await q(
      `INSERT INTO family_documents (owner_numero_h, member_numero_h, type, description, annee)
       VALUES (:me, :member, :type, :description, :annee)
       RETURNING *`,
      {
        me: req.user.numeroH,
        member: memberNumeroH,
        type,
        description: description.slice(0, 2000),
        annee: req.body.annee ? String(req.body.annee).trim().slice(0, 20) : null,
      }
    );
    res.status(201).json({ success: true, document: toDoc(row) });
  } catch (err) {
    console.error('family-data POST document:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// DELETE /api/family-data/documents/:id
router.delete('/documents/:id', async (req, res) => {
  try {
    const rows = await q(
      `DELETE FROM family_documents WHERE id = :id AND owner_numero_h = :me RETURNING id`,
      { id: req.params.id, me: req.user.numeroH }
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Document introuvable.' });
    res.json({ success: true });
  } catch (err) {
    console.error('family-data DELETE document:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

export default router;
