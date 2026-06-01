/**
 * Réseau des Imams — communication, annonces du vendredi, communautés
 * Préfixe : /api/imam-network
 *
 * Règles :
 *  - L'imam décide lui-même de tout (verset, message, rythme)
 *  - Aucune IA ne choisit du contenu religieux
 *  - Adhésion des fidèles : volontaire uniquement
 */

import express from 'express';
import { sequelize } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// ── Inscription / profil imam ─────────────────────────────────────────────────

router.post('/register', authenticate, async (req, res) => {
  const { nom_mosquee, adresse, quartier, ville, pays, bio } = req.body;
  const numeroH = req.userId;
  if (!nom_mosquee || !ville || !pays)
    return res.status(400).json({ message: 'Nom mosquée, ville et pays requis.' });
  try {
    const [rows] = await sequelize.query(
      `INSERT INTO imam_network_profiles
         (numero_h, nom_mosquee, adresse, quartier, ville, pays, bio)
       VALUES (:nh, :nm, :adr, :qrt, :vil, :pays, :bio)
       ON CONFLICT (numero_h) DO UPDATE SET
         nom_mosquee = EXCLUDED.nom_mosquee,
         adresse     = EXCLUDED.adresse,
         quartier    = EXCLUDED.quartier,
         ville       = EXCLUDED.ville,
         pays        = EXCLUDED.pays,
         bio         = EXCLUDED.bio,
         updated_at  = NOW()
       RETURNING *`,
      { replacements: { nh: numeroH, nm: nom_mosquee, adr: adresse || '', qrt: quartier || '', vil: ville, pays, bio: bio || '' } }
    );
    res.json({ success: true, profile: rows[0] });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/profile/me', authenticate, async (req, res) => {
  try {
    const [rows] = await sequelize.query(
      `SELECT p.*, u.prenom, u.nom_famille, u.photo
       FROM imam_network_profiles p
       LEFT JOIN users u ON u.numero_h = p.numero_h
       WHERE p.numero_h = :nh AND p.is_active = true`,
      { replacements: { nh: req.userId } }
    );
    if (!rows.length) return res.status(404).json({ message: 'Profil imam introuvable.' });
    res.json({ profile: rows[0] });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/profile/:numeroH', authenticate, async (req, res) => {
  try {
    const [rows] = await sequelize.query(
      `SELECT p.*, u.prenom, u.nom_famille, u.photo
       FROM imam_network_profiles p
       LEFT JOIN users u ON u.numero_h = p.numero_h
       WHERE p.numero_h = :nh AND p.is_active = true`,
      { replacements: { nh: req.params.numeroH } }
    );
    if (!rows.length) return res.status(404).json({ message: 'Imam introuvable.' });
    res.json({ profile: rows[0] });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Liste des imams par pays ───────────────────────────────────────────────────

router.get('/imams/:pays', authenticate, async (req, res) => {
  try {
    const search = req.query.search || '';
    const [imams] = await sequelize.query(
      `SELECT p.numero_h, p.nom_mosquee, p.quartier, p.ville, p.pays, p.bio,
              u.prenom, u.nom_famille, u.photo,
              (SELECT COUNT(*) FROM imam_community_members icm
               WHERE icm.imam_numero_h = p.numero_h AND icm.is_active = true) AS nb_fideles
       FROM imam_network_profiles p
       LEFT JOIN users u ON u.numero_h = p.numero_h
       WHERE p.pays ILIKE :pays AND p.is_active = true
       ${search ? "AND (p.nom_mosquee ILIKE :s OR p.quartier ILIKE :s OR p.ville ILIKE :s)" : ""}
       ORDER BY p.ville, p.nom_mosquee`,
      { replacements: { pays: `%${req.params.pays}%`, s: `%${search}%` } }
    );
    res.json({ imams });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Connexions imam ↔ imam ────────────────────────────────────────────────────

router.post('/connect/:targetNumeroH', authenticate, async (req, res) => {
  const from = req.userId;
  const to   = req.params.targetNumeroH;
  if (from === to) return res.status(400).json({ message: 'Vous ne pouvez pas vous connecter à vous-même.' });
  try {
    await sequelize.query(
      `INSERT INTO imam_connections (imam_numero_h, connected_numero_h, statut)
       VALUES (:from, :to, 'pending')
       ON CONFLICT (imam_numero_h, connected_numero_h) DO NOTHING`,
      { replacements: { from, to } }
    );
    const [target] = await sequelize.query(
      `SELECT u.prenom, u.nom_famille FROM users u WHERE u.numero_h = :nh`,
      { replacements: { nh: to } }
    );
    if (target.length) {
      await sequelize.query(
        `INSERT INTO notifications (user_id, type, message)
         VALUES (:uid, 'imam_connection', :msg)`,
        { replacements: { uid: to, msg: `🕌 Un imam souhaite se connecter avec vous dans le réseau.` } }
      ).catch(() => {});
    }
    res.json({ success: true, message: 'Demande de connexion envoyée.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/connect/:fromNumeroH/accept', authenticate, async (req, res) => {
  await sequelize.query(
    `UPDATE imam_connections SET statut = 'accepted'
     WHERE imam_numero_h = :from AND connected_numero_h = :to`,
    { replacements: { from: req.params.fromNumeroH, to: req.userId } }
  );
  await sequelize.query(
    `INSERT INTO imam_connections (imam_numero_h, connected_numero_h, statut)
     VALUES (:to, :from, 'accepted')
     ON CONFLICT (imam_numero_h, connected_numero_h) DO UPDATE SET statut = 'accepted'`,
    { replacements: { from: req.params.fromNumeroH, to: req.userId } }
  );
  res.json({ success: true });
});

router.get('/connections', authenticate, async (req, res) => {
  try {
    const [connections] = await sequelize.query(
      `SELECT c.*, p.nom_mosquee, p.ville, p.quartier,
              u.prenom, u.nom_famille, u.photo
       FROM imam_connections c
       JOIN imam_network_profiles p ON p.numero_h = c.connected_numero_h
       LEFT JOIN users u ON u.numero_h = c.connected_numero_h
       WHERE c.imam_numero_h = :nh AND c.statut = 'accepted'
       ORDER BY u.prenom`,
      { replacements: { nh: req.userId } }
    );
    const [pending] = await sequelize.query(
      `SELECT c.*, p.nom_mosquee, p.ville,
              u.prenom, u.nom_famille, u.photo
       FROM imam_connections c
       JOIN imam_network_profiles p ON p.numero_h = c.imam_numero_h
       LEFT JOIN users u ON u.numero_h = c.imam_numero_h
       WHERE c.connected_numero_h = :nh AND c.statut = 'pending'`,
      { replacements: { nh: req.userId } }
    );
    res.json({ connections, pending });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Communauté des fidèles ────────────────────────────────────────────────────

router.get('/community', authenticate, async (req, res) => {
  try {
    const [members] = await sequelize.query(
      `SELECT m.*, u.prenom, u.nom_famille, u.photo, u.tel1
       FROM imam_community_members m
       LEFT JOIN users u ON u.numero_h = m.fidele_numero_h
       WHERE m.imam_numero_h = :nh AND m.is_active = true
       ORDER BY m.joined_at DESC`,
      { replacements: { nh: req.userId } }
    );
    res.json({ members, total: members.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/community/join/:imamNumeroH', authenticate, async (req, res) => {
  const imamNh    = req.params.imamNumeroH;
  const fideleNh  = req.userId;
  const [imam] = await sequelize.query(
    `SELECT * FROM imam_network_profiles WHERE numero_h = :nh AND is_active = true`,
    { replacements: { nh: imamNh } }
  );
  if (!imam.length) return res.status(404).json({ message: 'Imam introuvable.' });
  const [user] = await sequelize.query(
    `SELECT prenom, nom_famille, tel1 FROM users WHERE numero_h = :nh`,
    { replacements: { nh: fideleNh } }
  );
  const u = user[0] || {};
  await sequelize.query(
    `INSERT INTO imam_community_members
       (imam_numero_h, fidele_numero_h, fidele_nom, fidele_telephone, quartier)
     VALUES (:inh, :fnh, :nom, :tel, :qrt)
     ON CONFLICT (imam_numero_h, fidele_numero_h) DO UPDATE SET is_active = true`,
    { replacements: {
        inh: imamNh, fnh: fideleNh,
        nom: `${u.prenom || ''} ${u.nom_famille || ''}`.trim() || fideleNh,
        tel: u.tel1 || '', qrt: req.body.quartier || ''
    }}
  );
  await sequelize.query(
    `INSERT INTO notifications (user_id, type, message) VALUES (:uid, 'community_join', :msg)`,
    { replacements: { uid: imamNh, msg: `👤 Un nouveau fidèle a rejoint votre communauté.` } }
  ).catch(() => {});
  res.json({ success: true, message: `Vous avez rejoint la mosquée ${imam[0].nom_mosquee}.` });
});

router.delete('/community/leave/:imamNumeroH', authenticate, async (req, res) => {
  await sequelize.query(
    `UPDATE imam_community_members SET is_active = false
     WHERE imam_numero_h = :inh AND fidele_numero_h = :fnh`,
    { replacements: { inh: req.params.imamNumeroH, fnh: req.userId } }
  );
  res.json({ success: true });
});

// ── Annonce du Vendredi ───────────────────────────────────────────────────────

router.post('/friday', authenticate, async (req, res) => {
  const {
    sourate_numero, sourate_nom, versets_debut, versets_fin,
    texte_arabe, traduction, message_imam, date_vendredi
  } = req.body;
  const imamNh = req.userId;
  if (!message_imam || !date_vendredi)
    return res.status(400).json({ message: 'Message et date du vendredi requis.' });
  try {
    const [rows] = await sequelize.query(
      `INSERT INTO friday_announcements
         (imam_numero_h, sourate_numero, sourate_nom, versets_debut, versets_fin,
          texte_arabe, traduction, message_imam, date_vendredi)
       VALUES (:inh, :sn, :snm, :vd, :vf, :ta, :tr, :mi, :dv)
       RETURNING *`,
      { replacements: {
          inh: imamNh,
          sn:  sourate_numero || null, snm: sourate_nom || '',
          vd:  versets_debut  || null, vf:  versets_fin  || null,
          ta:  texte_arabe    || '',   tr:  traduction    || '',
          mi:  message_imam,           dv:  date_vendredi
      }}
    );
    res.json({ success: true, announcement: rows[0] });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/friday/:id/send', authenticate, async (req, res) => {
  const imamNh = req.userId;
  const [anns] = await sequelize.query(
    `SELECT * FROM friday_announcements WHERE id = :id AND imam_numero_h = :nh`,
    { replacements: { id: req.params.id, nh: imamNh } }
  );
  if (!anns.length) return res.status(404).json({ message: 'Annonce introuvable.' });
  const ann = anns[0];

  const [imamProfile] = await sequelize.query(
    `SELECT nom_mosquee FROM imam_network_profiles WHERE numero_h = :nh`,
    { replacements: { nh: imamNh } }
  );
  const mosquee = imamProfile[0]?.nom_mosquee || 'votre imam';

  const sourate = ann.sourate_nom
    ? `Sourate ${ann.sourate_nom}${ann.versets_debut ? ` (v.${ann.versets_debut}${ann.versets_fin ? '-' + ann.versets_fin : ''})` : ''}`
    : '';

  const msg = `🕌 ${mosquee} — Vendredi ${new Date(ann.date_vendredi).toLocaleDateString('fr-FR')}\n`
    + (sourate ? `📖 ${sourate}\n` : '')
    + (ann.texte_arabe ? `${ann.texte_arabe}\n` : '')
    + `\n💬 ${ann.message_imam}`;

  const [fideles] = await sequelize.query(
    `SELECT fidele_numero_h FROM imam_community_members
     WHERE imam_numero_h = :nh AND is_active = true AND fidele_numero_h IS NOT NULL`,
    { replacements: { nh: imamNh } }
  );

  let sent = 0;
  for (const f of fideles) {
    await sequelize.query(
      `INSERT INTO notifications (user_id, type, message) VALUES (:uid, 'friday_khutba', :msg)`,
      { replacements: { uid: f.fidele_numero_h, msg } }
    ).catch(() => {});
    sent++;
  }

  await sequelize.query(
    `UPDATE friday_announcements
     SET is_sent = true, sent_at = NOW(), nb_fideles_notifies = :nb
     WHERE id = :id`,
    { replacements: { nb: sent, id: req.params.id } }
  );
  res.json({ success: true, nb_notifies: sent });
});

router.get('/friday/history', authenticate, async (req, res) => {
  try {
    const [history] = await sequelize.query(
      `SELECT * FROM friday_announcements
       WHERE imam_numero_h = :nh
       ORDER BY date_vendredi DESC LIMIT 20`,
      { replacements: { nh: req.userId } }
    );
    res.json({ history });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/friday/upcoming', authenticate, async (req, res) => {
  try {
    const imamNh = req.userId;
    const [mosques] = await sequelize.query(
      `SELECT imam_numero_h FROM imam_community_members
       WHERE fidele_numero_h = :nh AND is_active = true`,
      { replacements: { nh: imamNh } }
    );
    if (!mosques.length) return res.json({ announcements: [] });

    const imamIds = mosques.map(m => m.imam_numero_h);
    const [announcements] = await sequelize.query(
      `SELECT a.*, p.nom_mosquee, p.quartier, p.ville,
              u.prenom, u.nom_famille, u.photo
       FROM friday_announcements a
       JOIN imam_network_profiles p ON p.numero_h = a.imam_numero_h
       LEFT JOIN users u ON u.numero_h = a.imam_numero_h
       WHERE a.imam_numero_h = ANY($1::text[])
         AND a.is_sent = true
         AND a.date_vendredi >= CURRENT_DATE - INTERVAL '7 days'
       ORDER BY a.date_vendredi DESC`,
      { bind: [imamIds] }
    );
    res.json({ announcements });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Coordinateur national ─────────────────────────────────────────────────────

router.get('/coordinator/:pays/dashboard', authenticate, async (req, res) => {
  try {
    const pays = req.params.pays;
    const [coord] = await sequelize.query(
      `SELECT * FROM national_religious_coordinators WHERE numero_h = :nh AND is_active = true`,
      { replacements: { nh: req.userId } }
    );
    if (!coord.length) return res.status(403).json({ message: 'Accès coordinateur requis.' });

    const [[{ nb_imams }]] = await sequelize.query(
      `SELECT COUNT(*) AS nb_imams FROM imam_network_profiles WHERE pays ILIKE :pays AND is_active = true`,
      { replacements: { pays: `%${pays}%` } }
    );
    const [[{ nb_fideles }]] = await sequelize.query(
      `SELECT COUNT(DISTINCT icm.fidele_numero_h) AS nb_fideles
       FROM imam_community_members icm
       JOIN imam_network_profiles p ON p.numero_h = icm.imam_numero_h
       WHERE p.pays ILIKE :pays AND icm.is_active = true`,
      { replacements: { pays: `%${pays}%` } }
    );
    const [[{ nb_khutbas }]] = await sequelize.query(
      `SELECT COUNT(*) AS nb_khutbas
       FROM friday_announcements fa
       JOIN imam_network_profiles p ON p.numero_h = fa.imam_numero_h
       WHERE p.pays ILIKE :pays AND fa.date_vendredi >= CURRENT_DATE - INTERVAL '30 days'`,
      { replacements: { pays: `%${pays}%` } }
    );
    res.json({ nb_imams, nb_fideles, nb_khutbas });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/coordinator/broadcast', authenticate, async (req, res) => {
  try {
    const { pays, message } = req.body;
    const [coord] = await sequelize.query(
      `SELECT * FROM national_religious_coordinators WHERE numero_h = :nh AND is_active = true`,
      { replacements: { nh: req.userId } }
    );
    if (!coord.length) return res.status(403).json({ message: 'Accès coordinateur requis.' });

    const [imams] = await sequelize.query(
      `SELECT numero_h FROM imam_network_profiles WHERE pays ILIKE :pays AND is_active = true`,
      { replacements: { pays: `%${pays}%` } }
    );
    let sent = 0;
    for (const imam of imams) {
      await sequelize.query(
        `INSERT INTO notifications (user_id, type, message) VALUES (:uid, 'coordinator_msg', :msg)`,
        { replacements: { uid: imam.numero_h, msg: `📢 Message du coordinateur : ${message}` } }
      ).catch(() => {});
      sent++;
    }
    res.json({ success: true, nb_imams_notifies: sent });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
