/**
 * Réseau Professionnel Générique
 * Un seul système pour tous les corps : imam, médecin, enseignant, avocat, commerçant...
 * Préfixe : /api/pro-network/:type
 */

import express from 'express';
import { sequelize } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const VALID_TYPES = [
  'imam', 'mosque', 'clinic', 'school', 'madrasa',
  'enterprise', 'commerce', 'ngo', 'security_agency',
  'supplier', 'journalist', 'scientist'
];

function validateType(req, res, next) {
  if (!VALID_TYPES.includes(req.params.type)) {
    return res.status(400).json({ message: 'Type de réseau invalide.' });
  }
  next();
}

// ── Profil ─────────────────────────────────────────────────────────────────────

router.post('/:type/register', authenticate, validateType, async (req, res) => {
  const { nom_structure, adresse, quartier, ville, pays, bio } = req.body;
  const { type } = req.params;
  const numeroH = req.userId;
  if (!nom_structure || !ville) return res.status(400).json({ message: 'Nom et ville requis.' });
  try {
    const [rows] = await sequelize.query(
      `INSERT INTO pro_network_profiles (numero_h, pro_type, nom_structure, adresse, quartier, ville, pays, bio)
       VALUES (:nh, :type, :nom, :adr, :qrt, :vil, :pays, :bio)
       ON CONFLICT (numero_h, pro_type) DO UPDATE SET
         nom_structure = EXCLUDED.nom_structure,
         adresse       = EXCLUDED.adresse,
         quartier      = EXCLUDED.quartier,
         ville         = EXCLUDED.ville,
         pays          = EXCLUDED.pays,
         bio           = EXCLUDED.bio,
         updated_at    = NOW()
       RETURNING *`,
      { replacements: { nh: numeroH, type, nom: nom_structure, adr: adresse || '', qrt: quartier || '', vil: ville, pays: pays || '', bio: bio || '' } }
    );
    res.json({ success: true, profile: rows[0] });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:type/profile/me', authenticate, validateType, async (req, res) => {
  try {
    const [rows] = await sequelize.query(
      `SELECT p.*, u.prenom, u.nom_famille, u.photo
       FROM pro_network_profiles p
       LEFT JOIN users u ON u.numero_h = p.numero_h
       WHERE p.numero_h = :nh AND p.pro_type = :type AND p.is_active = true`,
      { replacements: { nh: req.userId, type: req.params.type } }
    );
    if (!rows.length) return res.status(404).json({ message: 'Profil introuvable.' });
    res.json({ profile: rows[0] });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Liste des membres du réseau (pour découvrir des pairs) ────────────────────

router.get('/:type/members', authenticate, validateType, async (req, res) => {
  try {
    const search = req.query.search || '';
    const [members] = await sequelize.query(
      `SELECT p.numero_h, p.nom_structure, p.quartier, p.ville, p.pays, p.bio,
              u.prenom, u.nom_famille, u.photo,
              (SELECT COUNT(*) FROM pro_community_members cm
               WHERE cm.pro_numero_h = p.numero_h AND cm.pro_type = p.pro_type AND cm.is_active = true) AS nb_membres
       FROM pro_network_profiles p
       LEFT JOIN users u ON u.numero_h = p.numero_h
       WHERE p.pro_type = :type AND p.is_active = true
       ${search ? "AND (p.nom_structure ILIKE :s OR p.quartier ILIKE :s OR p.ville ILIKE :s)" : ""}
       ORDER BY p.ville, p.nom_structure`,
      { replacements: { type: req.params.type, s: `%${search}%` } }
    );
    res.json({ members });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Connexions pair ↔ pair ─────────────────────────────────────────────────────

router.post('/:type/connect/:targetNh', authenticate, validateType, async (req, res) => {
  const from = req.userId;
  const to   = req.params.targetNh;
  const { type } = req.params;
  if (from === to) return res.status(400).json({ message: 'Impossible de vous connecter à vous-même.' });
  try {
    await sequelize.query(
      `INSERT INTO pro_connections (from_numero_h, to_numero_h, pro_type, statut)
       VALUES (:from, :to, :type, 'pending')
       ON CONFLICT (from_numero_h, to_numero_h, pro_type) DO NOTHING`,
      { replacements: { from, to, type } }
    );
    await sequelize.query(
      `INSERT INTO notifications (user_id, type, message) VALUES (:uid, 'pro_connection', :msg)`,
      { replacements: { uid: to, msg: `🤝 Un professionnel souhaite se connecter avec vous dans le réseau.` } }
    ).catch(() => {});
    res.json({ success: true, message: 'Demande envoyée.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:type/connect/:fromNh/accept', authenticate, validateType, async (req, res) => {
  const { type, fromNh } = req.params;
  const to = req.userId;
  await sequelize.query(
    `UPDATE pro_connections SET statut = 'accepted'
     WHERE from_numero_h = :from AND to_numero_h = :to AND pro_type = :type`,
    { replacements: { from: fromNh, to, type } }
  );
  await sequelize.query(
    `INSERT INTO pro_connections (from_numero_h, to_numero_h, pro_type, statut)
     VALUES (:to, :from, :type, 'accepted')
     ON CONFLICT (from_numero_h, to_numero_h, pro_type) DO UPDATE SET statut = 'accepted'`,
    { replacements: { from: fromNh, to, type } }
  );
  res.json({ success: true });
});

router.get('/:type/connections', authenticate, validateType, async (req, res) => {
  try {
    const { type } = req.params;
    const [connections] = await sequelize.query(
      `SELECT c.*, p.nom_structure, p.ville, p.quartier, u.prenom, u.nom_famille, u.photo
       FROM pro_connections c
       JOIN pro_network_profiles p ON p.numero_h = c.to_numero_h AND p.pro_type = c.pro_type
       LEFT JOIN users u ON u.numero_h = c.to_numero_h
       WHERE c.from_numero_h = :nh AND c.pro_type = :type AND c.statut = 'accepted'
       ORDER BY u.prenom`,
      { replacements: { nh: req.userId, type } }
    );
    const [pending] = await sequelize.query(
      `SELECT c.*, p.nom_structure, p.ville, u.prenom, u.nom_famille, u.photo
       FROM pro_connections c
       JOIN pro_network_profiles p ON p.numero_h = c.from_numero_h AND p.pro_type = c.pro_type
       LEFT JOIN users u ON u.numero_h = c.from_numero_h
       WHERE c.to_numero_h = :nh AND c.pro_type = :type AND c.statut = 'pending'`,
      { replacements: { nh: req.userId, type } }
    );
    res.json({ connections, pending });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Communauté (followers/membres) ────────────────────────────────────────────

router.get('/:type/community', authenticate, validateType, async (req, res) => {
  try {
    const [members] = await sequelize.query(
      `SELECT m.*, u.prenom, u.nom_famille, u.photo
       FROM pro_community_members m
       LEFT JOIN users u ON u.numero_h = m.member_numero_h
       WHERE m.pro_numero_h = :nh AND m.pro_type = :type AND m.is_active = true
       ORDER BY m.joined_at DESC`,
      { replacements: { nh: req.userId, type: req.params.type } }
    );
    res.json({ members, total: members.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/:type/community/join/:proNh', authenticate, validateType, async (req, res) => {
  const { type, proNh } = req.params;
  const memberNh = req.userId;
  const [pro] = await sequelize.query(
    `SELECT * FROM pro_network_profiles WHERE numero_h = :nh AND pro_type = :type AND is_active = true`,
    { replacements: { nh: proNh, type } }
  );
  if (!pro.length) return res.status(404).json({ message: 'Professionnel introuvable.' });
  const [user] = await sequelize.query(
    `SELECT prenom, nom_famille, tel1 FROM users WHERE numero_h = :nh`,
    { replacements: { nh: memberNh } }
  );
  const u = user[0] || {};
  await sequelize.query(
    `INSERT INTO pro_community_members (pro_numero_h, member_numero_h, pro_type, nom_membre, telephone, quartier)
     VALUES (:pnh, :mnh, :type, :nom, :tel, :qrt)
     ON CONFLICT (pro_numero_h, member_numero_h, pro_type) DO UPDATE SET is_active = true`,
    { replacements: {
        pnh: proNh, mnh: memberNh, type,
        nom: `${u.prenom || ''} ${u.nom_famille || ''}`.trim() || memberNh,
        tel: u.tel1 || '', qrt: req.body.quartier || ''
    }}
  );
  await sequelize.query(
    `INSERT INTO notifications (user_id, type, message) VALUES (:uid, 'community_join', :msg)`,
    { replacements: { uid: proNh, msg: `👤 Un nouveau membre a rejoint votre communauté.` } }
  ).catch(() => {});
  res.json({ success: true, message: `Vous avez rejoint ${pro[0].nom_structure}.` });
});

router.delete('/:type/community/leave/:proNh', authenticate, validateType, async (req, res) => {
  await sequelize.query(
    `UPDATE pro_community_members SET is_active = false
     WHERE pro_numero_h = :pnh AND member_numero_h = :mnh AND pro_type = :type`,
    { replacements: { pnh: req.params.proNh, mnh: req.userId, type: req.params.type } }
  );
  res.json({ success: true });
});

// ── Annonces (broadcast à la communauté) ──────────────────────────────────────

router.post('/:type/announcement', authenticate, validateType, async (req, res) => {
  const { titre, contenu, date_annonce } = req.body;
  const { type } = req.params;
  if (!contenu) return res.status(400).json({ message: 'Contenu requis.' });
  try {
    const [rows] = await sequelize.query(
      `INSERT INTO pro_announcements (pro_numero_h, pro_type, titre, contenu, date_annonce)
       VALUES (:nh, :type, :titre, :contenu, :date)
       RETURNING *`,
      { replacements: { nh: req.userId, type, titre: titre || '', contenu, date: date_annonce || new Date().toISOString().slice(0, 10) } }
    );
    res.json({ success: true, announcement: rows[0] });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/:type/announcement/:id/send', authenticate, validateType, async (req, res) => {
  const { type } = req.params;
  const proNh = req.userId;
  const [anns] = await sequelize.query(
    `SELECT * FROM pro_announcements WHERE id = :id AND pro_numero_h = :nh AND pro_type = :type`,
    { replacements: { id: req.params.id, nh: proNh, type } }
  );
  if (!anns.length) return res.status(404).json({ message: 'Annonce introuvable.' });
  const ann = anns[0];
  const [profile] = await sequelize.query(
    `SELECT nom_structure FROM pro_network_profiles WHERE numero_h = :nh AND pro_type = :type`,
    { replacements: { nh: proNh, type } }
  );
  const nom = profile[0]?.nom_structure || 'Professionnel';
  const msg = `📢 ${nom}${ann.titre ? ' — ' + ann.titre : ''}\n${ann.contenu}`;
  const [members] = await sequelize.query(
    `SELECT member_numero_h FROM pro_community_members
     WHERE pro_numero_h = :nh AND pro_type = :type AND is_active = true AND member_numero_h IS NOT NULL`,
    { replacements: { nh: proNh, type } }
  );
  let sent = 0;
  for (const m of members) {
    await sequelize.query(
      `INSERT INTO notifications (user_id, type, message) VALUES (:uid, 'pro_announcement', :msg)`,
      { replacements: { uid: m.member_numero_h, msg } }
    ).catch(() => {});
    sent++;
  }
  await sequelize.query(
    `UPDATE pro_announcements SET is_sent = true, sent_at = NOW(), nb_notifies = :nb WHERE id = :id`,
    { replacements: { nb: sent, id: req.params.id } }
  );
  res.json({ success: true, nb_notifies: sent });
});

router.get('/:type/announcement/history', authenticate, validateType, async (req, res) => {
  try {
    const [history] = await sequelize.query(
      `SELECT * FROM pro_announcements
       WHERE pro_numero_h = :nh AND pro_type = :type
       ORDER BY date_annonce DESC LIMIT 20`,
      { replacements: { nh: req.userId, type: req.params.type } }
    );
    res.json({ history });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
