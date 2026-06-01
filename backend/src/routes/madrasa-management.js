/**
 * Routes gestion interne — Formation Religieuse (Daroul / Médersa / Institut islamique)
 * Préfixe : /api/madrasa-mgmt/:tenantCode
 *
 * Niveaux : Iqra → Qa'idah → Débutant → Juz' → Hizb → Hafiz
 * Matières : Coran, Tajwid, Hadith, Fiqh, Arabe, Histoire islamique, Morale
 */

import express from 'express';
import { sequelize } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// ─── Middleware : vérifier que l'utilisateur est directeur / propriétaire ──────
async function verifyTenant(req, res, next) {
  const { tenantCode } = req.params;
  const userId = req.userId;
  const role = req.user?.role || '';
  const isAdminUser = !!(req.user?.isMasterAdmin || role === 'admin' || role === 'super-admin');
  try {
    if (isAdminUser) {
      const [rows] = await sequelize.query(
        `SELECT * FROM management_tenants WHERE tenant_code = :tc LIMIT 1`,
        { replacements: { tc: tenantCode } }
      );
      req.tenant = (rows && rows[0]) || { tenant_code: tenantCode, name: 'Madrasa Admin', type: 'madrasa', owner_numero_h: 'ADMIN-G7', is_active: true };
      return next();
    }
    const [rows] = await sequelize.query(
      `SELECT * FROM management_tenants WHERE tenant_code = :tc AND is_active = true`,
      { replacements: { tc: tenantCode } }
    );
    if (!rows.length) return res.status(404).json({ message: 'Institut introuvable.' });
    const tenant = rows[0];
    if (tenant.owner_numero_h !== userId) {
      return res.status(403).json({ message: 'Accès réservé au directeur.' });
    }
    req.tenant = tenant;
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// ─── Middleware : directeur OU membre actif ────────────────────────────────────
async function verifyMember(req, res, next) {
  const { tenantCode } = req.params;
  const userId = req.userId;
  const role = req.user?.role || '';
  const isAdminUser = !!(req.user?.isMasterAdmin || role === 'admin' || role === 'super-admin');
  try {
    if (isAdminUser) {
      const [rows] = await sequelize.query(
        `SELECT * FROM management_tenants WHERE tenant_code = :tc LIMIT 1`,
        { replacements: { tc: tenantCode } }
      );
      req.tenant = (rows && rows[0]) || { tenant_code: tenantCode, name: 'Madrasa Admin', type: 'madrasa', owner_numero_h: 'ADMIN-G7', is_active: true };
      req.memberRole = 'directeur';
      return next();
    }
    const [tenants] = await sequelize.query(
      `SELECT * FROM management_tenants WHERE tenant_code = :tc AND is_active = true`,
      { replacements: { tc: tenantCode } }
    );
    if (!tenants.length) return res.status(404).json({ message: 'Institut introuvable.' });
    const tenant = tenants[0];
    if (tenant.owner_numero_h === userId) {
      req.tenant = tenant; req.memberRole = 'directeur'; return next();
    }
    const [members] = await sequelize.query(
      `SELECT * FROM madrasa_members WHERE tenant_code = :tc AND numero_h = :uid AND is_active = true`,
      { replacements: { tc: tenantCode, uid: userId } }
    );
    if (!members.length) return res.status(403).json({ message: 'Vous n\'êtes pas membre de cet institut.' });
    req.tenant = tenant; req.memberRole = members[0].role; next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// ── Infos générales ────────────────────────────────────────────────────────────
router.get('/:tenantCode/info', authenticate, verifyTenant, async (req, res) => {
  res.json({ success: true, tenant: req.tenant });
});

// ── Profil du directeur (chef) ─────────────────────────────────────────────────
router.get('/:tenantCode/director-profile', authenticate, verifyMember, async (req, res) => {
  const tc = req.params.tenantCode;
  try {
    const [rows] = await sequelize.query(
      `SELECT u.numero_h, u.prenom,
              COALESCE(u.nom_famille, u."nomFamille", '') AS nom_famille,
              u.photo
       FROM management_tenants mt
       JOIN users u ON u.numero_h = mt.owner_numero_h
       WHERE mt.tenant_code = :tc AND mt.is_active = true
       LIMIT 1`,
      { replacements: { tc } }
    );
    if (!rows.length) return res.status(404).json({ message: 'Directeur introuvable.' });
    const d = rows[0];
    res.json({
      numero_h:  d.numero_h,
      nom:       `${d.prenom || ''} ${d.nom_famille || ''}`.trim(),
      photo:     d.photo || null,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get('/:tenantCode/dashboard', authenticate, verifyTenant, async (req, res) => {
  const tc = req.params.tenantCode;
  try {
    const qr = (sql, rep) => sequelize.query(sql, { replacements: rep }).then(r => r[0][0]).catch(() => ({}));
    const today = new Date().toISOString().slice(0, 10);
    const [r1, r2, r3, r4, r5, r6] = await Promise.all([
      qr(`SELECT COUNT(*) AS total_etudiants FROM madrasa_students WHERE tenant_code=:tc AND is_active=true`, { tc }),
      qr(`SELECT COUNT(*) AS total_enseignants FROM madrasa_staff WHERE tenant_code=:tc`, { tc }),
      qr(`SELECT COUNT(*) AS total_halaqas FROM madrasa_halaqas WHERE tenant_code=:tc`, { tc }),
      qr(`SELECT COUNT(*) AS presents_today FROM madrasa_attendance WHERE tenant_code=:tc AND date_presence=:today AND statut='present'`, { tc, today }),
      qr(`SELECT COALESCE(SUM(montant),0) AS frais_mois FROM madrasa_fees WHERE tenant_code=:tc AND est_paye=true AND date_paiement>=date_trunc('month',CURRENT_DATE)`, { tc }),
      qr(`SELECT COUNT(*) AS impaye_count FROM madrasa_fees WHERE tenant_code=:tc AND est_paye=false`, { tc }),
    ]);
    res.json({ totalStudents: +(r1.total_etudiants||0), totalStaff: +(r2.total_enseignants||0),
      totalHalaqas: +(r3.total_halaqas||0), presentToday: +(r4.presents_today||0),
      feesCollected: +(r5.frais_mois||0), unpaidFees: +(r6.impaye_count||0) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Étudiants ──────────────────────────────────────────────────────────────────
router.get('/:tenantCode/students', authenticate, verifyMember, async (req, res) => {
  const tc = req.params.tenantCode;
  const search = req.query.search || '';
  const [students] = await sequelize.query(
    `SELECT * FROM madrasa_students WHERE tenant_code = :tc AND is_active = true
     ${search ? "AND (prenom ILIKE :s OR nom ILIKE :s OR numero_h ILIKE :s)" : ""}
     ORDER BY nom, prenom`,
    { replacements: { tc, s: `%${search}%` } }
  );
  res.json({ students });
});

router.post('/:tenantCode/students', authenticate, verifyTenant, async (req, res) => {
  const tc = req.params.tenantCode;
  const { prenom, nom, date_naissance, sexe, telephone_parent, niveau, numero_h, parent_numero_h } = req.body;
  if (!prenom || !nom) return res.status(400).json({ message: 'Prénom et nom requis.' });
  try {
    const [rows] = await sequelize.query(
      `INSERT INTO madrasa_students (tenant_code, prenom, nom, date_naissance, sexe, telephone_parent, niveau, numero_h, parent_numero_h)
       VALUES (:tc, :prenom, :nom, :dn, :sexe, :tel, :niveau, :nh, :pnh) RETURNING *`,
      { replacements: { tc, prenom, nom, dn: date_naissance || null, sexe: sexe || 'M', tel: telephone_parent || '', niveau: niveau || 'Iqra', nh: numero_h || null, pnh: parent_numero_h || null } }
    );
    res.json({ student: rows[0] });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:tenantCode/students/:id', authenticate, verifyTenant, async (req, res) => {
  const { tenantCode: tc, id } = req.params;
  const { niveau } = req.body;
  await sequelize.query(
    `UPDATE madrasa_students SET niveau = COALESCE(:niveau, niveau), updated_at = NOW() WHERE id = :id AND tenant_code = :tc`,
    { replacements: { niveau: niveau || null, id, tc } }
  );
  res.json({ success: true });
});

router.delete('/:tenantCode/students/:id', authenticate, verifyTenant, async (req, res) => {
  await sequelize.query(
    `UPDATE madrasa_students SET is_active = false WHERE id = :id AND tenant_code = :tc`,
    { replacements: { id: req.params.id, tc: req.params.tenantCode } }
  );
  res.json({ success: true });
});

// ── Personnel enseignant ───────────────────────────────────────────────────────
router.get('/:tenantCode/staff', authenticate, verifyMember, async (req, res) => {
  const [staff] = await sequelize.query(
    `SELECT * FROM madrasa_staff WHERE tenant_code = :tc ORDER BY nom`,
    { replacements: { tc: req.params.tenantCode } }
  );
  res.json({ staff });
});

router.post('/:tenantCode/staff', authenticate, verifyTenant, async (req, res) => {
  const tc = req.params.tenantCode;
  const { prenom, nom, role, specialite, telephone, numero_h } = req.body;
  if (!prenom || !nom) return res.status(400).json({ message: 'Prénom et nom requis.' });
  const [rows] = await sequelize.query(
    `INSERT INTO madrasa_staff (tenant_code, prenom, nom, role, specialite, telephone, numero_h)
     VALUES (:tc, :prenom, :nom, :role, :spec, :tel, :nh) RETURNING *`,
    { replacements: { tc, prenom, nom, role: role || 'Enseignant', spec: specialite || 'Coran', tel: telephone || '', nh: numero_h || null } }
  );
  res.json({ staff: rows[0] });
});

router.delete('/:tenantCode/staff/:id', authenticate, verifyTenant, async (req, res) => {
  await sequelize.query(
    `DELETE FROM madrasa_staff WHERE id = :id AND tenant_code = :tc`,
    { replacements: { id: req.params.id, tc: req.params.tenantCode } }
  );
  res.json({ success: true });
});

// ── Halaqas (classes) ─────────────────────────────────────────────────────────
router.get('/:tenantCode/halaqas', authenticate, verifyMember, async (req, res) => {
  const [halaqas] = await sequelize.query(
    `SELECT h.*, COUNT(s.id) AS student_count
     FROM madrasa_halaqas h
     LEFT JOIN madrasa_students s ON s.tenant_code = h.tenant_code AND s.niveau = h.niveau AND s.is_active = true
     WHERE h.tenant_code = :tc
     GROUP BY h.id ORDER BY h.nom`,
    { replacements: { tc: req.params.tenantCode } }
  );
  res.json({ halaqas });
});

router.post('/:tenantCode/halaqas', authenticate, verifyTenant, async (req, res) => {
  const tc = req.params.tenantCode;
  const { nom, niveau, capacite, enseignant_id } = req.body;
  if (!nom) return res.status(400).json({ message: 'Nom requis.' });
  const [rows] = await sequelize.query(
    `INSERT INTO madrasa_halaqas (tenant_code, nom, niveau, capacite, enseignant_id)
     VALUES (:tc, :nom, :niveau, :cap, :eid) RETURNING *`,
    { replacements: { tc, nom, niveau: niveau || 'Iqra', cap: capacite || 20, eid: enseignant_id || null } }
  );
  res.json({ halaqa: rows[0] });
});

router.delete('/:tenantCode/halaqas/:id', authenticate, verifyTenant, async (req, res) => {
  await sequelize.query(
    `DELETE FROM madrasa_halaqas WHERE id = :id AND tenant_code = :tc`,
    { replacements: { id: req.params.id, tc: req.params.tenantCode } }
  );
  res.json({ success: true });
});

// ── Présences ─────────────────────────────────────────────────────────────────
router.get('/:tenantCode/attendance', authenticate, verifyMember, async (req, res) => {
  const tc = req.params.tenantCode;
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const [attendance] = await sequelize.query(
    `SELECT a.*, s.prenom AS student_prenom, s.nom AS student_nom
     FROM madrasa_attendance a
     JOIN madrasa_students s ON s.id = a.student_id
     WHERE a.tenant_code = :tc AND a.date_presence = :date ORDER BY s.nom`,
    { replacements: { tc, date } }
  );
  res.json({ attendance });
});

router.post('/:tenantCode/attendance', authenticate, verifyTenant, async (req, res) => {
  const tc = req.params.tenantCode;
  const { records } = req.body; // [{ student_id, statut }]
  const date = new Date().toISOString().slice(0, 10);
  for (const r of records || []) {
    await sequelize.query(
      `INSERT INTO madrasa_attendance (tenant_code, student_id, date_presence, statut)
       VALUES (:tc, :sid, :date, :statut)
       ON CONFLICT (tenant_code, student_id, date_presence) DO UPDATE SET statut = EXCLUDED.statut`,
      { replacements: { tc, sid: r.student_id, date, statut: r.statut || 'present' } }
    );
  }
  res.json({ success: true });
});

// ── Notes / Progression ───────────────────────────────────────────────────────
router.get('/:tenantCode/grades', authenticate, verifyMember, async (req, res) => {
  const tc = req.params.tenantCode;
  const [grades] = await sequelize.query(
    `SELECT g.*, s.prenom AS student_prenom, s.nom AS student_nom
     FROM madrasa_grades g
     JOIN madrasa_students s ON s.id = g.student_id
     WHERE g.tenant_code = :tc ORDER BY g.created_at DESC`,
    { replacements: { tc } }
  );
  res.json({ grades });
});

router.post('/:tenantCode/grades', authenticate, verifyTenant, async (req, res) => {
  const tc = req.params.tenantCode;
  const { student_id, matiere, note, note_max, periode, sourate, commentaire } = req.body;
  if (!student_id) return res.status(400).json({ message: 'Étudiant requis.' });
  const [rows] = await sequelize.query(
    `INSERT INTO madrasa_grades (tenant_code, student_id, matiere, note, note_max, periode, sourate, commentaire)
     VALUES (:tc, :sid, :mat, :note, :nm, :per, :srt, :com) RETURNING *`,
    { replacements: { tc, sid: student_id, mat: matiere || 'Coran', note: parseFloat(note) || 0, nm: parseFloat(note_max) || 20, per: periode || 'Trim 1', srt: sourate || '', com: commentaire || '' } }
  );
  res.json({ grade: rows[0] });
});

// ── Frais ─────────────────────────────────────────────────────────────────────
router.get('/:tenantCode/fees', authenticate, verifyMember, async (req, res) => {
  const tc = req.params.tenantCode;
  const [fees] = await sequelize.query(
    `SELECT f.*, s.prenom AS student_prenom, s.nom AS student_nom
     FROM madrasa_fees f
     JOIN madrasa_students s ON s.id = f.student_id
     WHERE f.tenant_code = :tc ORDER BY f.created_at DESC`,
    { replacements: { tc } }
  );
  res.json({ fees });
});

router.post('/:tenantCode/fees', authenticate, verifyTenant, async (req, res) => {
  const tc = req.params.tenantCode;
  const { student_id, type_frais, montant, echeance } = req.body;
  if (!student_id || !montant) return res.status(400).json({ message: 'Étudiant et montant requis.' });
  const [rows] = await sequelize.query(
    `INSERT INTO madrasa_fees (tenant_code, student_id, type_frais, montant, echeance)
     VALUES (:tc, :sid, :type, :montant, :ech) RETURNING *`,
    { replacements: { tc, sid: student_id, type: type_frais || 'Frais mensuels', montant: parseInt(montant), ech: echeance || null } }
  );
  res.json({ fee: rows[0] });
});

router.put('/:tenantCode/fees/:id/pay', authenticate, verifyTenant, async (req, res) => {
  await sequelize.query(
    `UPDATE madrasa_fees SET est_paye = true, date_paiement = NOW() WHERE id = :id AND tenant_code = :tc`,
    { replacements: { id: req.params.id, tc: req.params.tenantCode } }
  );
  res.json({ success: true });
});

// ── Membres (accès app par numeroH) ──────────────────────────────────────────
router.get('/:tenantCode/members', authenticate, verifyTenant, async (req, res) => {
  const [members] = await sequelize.query(
    `SELECT m.*, u.prenom || ' ' || u.nom AS nom_display
     FROM madrasa_members m
     LEFT JOIN users u ON u.numero_h = m.numero_h
     WHERE m.tenant_code = :tc AND m.is_active = true ORDER BY m.role, m.created_at`,
    { replacements: { tc: req.params.tenantCode } }
  );
  res.json({ members });
});

router.post('/:tenantCode/members/add', authenticate, verifyTenant, async (req, res) => {
  const tc = req.params.tenantCode;
  const { numero_h, role, linked_student_id } = req.body;
  if (!numero_h) return res.status(400).json({ message: 'NuméroH requis.' });
  const [users] = await sequelize.query(
    `SELECT * FROM users WHERE numero_h = :nh`, { replacements: { nh: numero_h } }
  );
  if (!users.length) return res.status(404).json({ message: 'Utilisateur introuvable sur la plateforme.' });
  try {
    await sequelize.query(
      `INSERT INTO madrasa_members (tenant_code, numero_h, role, linked_student_id, nom_display, is_active)
       VALUES (:tc, :nh, :role, :lsid, :nom, true)
       ON CONFLICT (tenant_code, numero_h) DO UPDATE SET role = EXCLUDED.role, is_active = true`,
      { replacements: { tc, nh: numero_h, role: role || 'apprenant', lsid: linked_student_id || null, nom: users[0].prenom + ' ' + users[0].nom } }
    );
    res.json({ success: true, message: `${users[0].prenom} ajouté comme ${role}.` });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:tenantCode/members/:id', authenticate, verifyTenant, async (req, res) => {
  await sequelize.query(
    `UPDATE madrasa_members SET is_active = false WHERE id = :id AND tenant_code = :tc`,
    { replacements: { id: req.params.id, tc: req.params.tenantCode } }
  );
  res.json({ success: true });
});

// ── Mon accès (étudiant / parent / enseignant) ─────────────────────────────────
router.get('/:tenantCode/my-access', authenticate, verifyMember, async (req, res) => {
  const tc = req.params.tenantCode;
  const userId = req.userId;
  const role = req.memberRole;

  if (role === 'directeur' || role === 'enseignant') {
    return res.json({ role, message: 'Accès directeur/enseignant — utilisez le tableau de bord complet.' });
  }

  // Trouver l'étudiant lié
  const [members] = await sequelize.query(
    `SELECT * FROM madrasa_members WHERE tenant_code = :tc AND numero_h = :uid AND is_active = true`,
    { replacements: { tc, uid: userId } }
  );
  const member = members[0];
  const studentId = member?.linked_student_id;

  let grades = [], fees = [], student = null;
  if (studentId) {
    const [gs] = await sequelize.query(
      `SELECT * FROM madrasa_grades WHERE tenant_code = :tc AND student_id = :sid ORDER BY created_at DESC`,
      { replacements: { tc, sid: studentId } }
    );
    grades = gs;
    const [fs] = await sequelize.query(
      `SELECT * FROM madrasa_fees WHERE tenant_code = :tc AND student_id = :sid ORDER BY created_at DESC`,
      { replacements: { tc, sid: studentId } }
    );
    fees = fs;
    const [ss] = await sequelize.query(
      `SELECT * FROM madrasa_students WHERE id = :sid`, { replacements: { sid: studentId } }
    );
    student = ss[0] || null;
  } else if (role === 'apprenant') {
    const [ss] = await sequelize.query(
      `SELECT * FROM madrasa_students WHERE tenant_code = :tc AND numero_h = :uid AND is_active = true`,
      { replacements: { tc, uid: userId } }
    );
    if (ss.length) {
      student = ss[0];
      const [gs] = await sequelize.query(
        `SELECT * FROM madrasa_grades WHERE tenant_code = :tc AND student_id = :sid ORDER BY created_at DESC`,
        { replacements: { tc, sid: student.id } }
      );
      grades = gs;
      const [fs] = await sequelize.query(
        `SELECT * FROM madrasa_fees WHERE tenant_code = :tc AND student_id = :sid ORDER BY created_at DESC`,
        { replacements: { tc, sid: student.id } }
      );
      fees = fs;
    }
  }

  res.json({ role, student, grades, fees, member });
});

// ── Bulletins de progression ───────────────────────────────────────────────────
router.get('/:tenantCode/bulletins', authenticate, verifyMember, async (req, res) => {
  const tc = req.params.tenantCode;
  const periode = req.query.periode;
  const [bulletins] = await sequelize.query(
    `SELECT b.*, s.prenom AS student_prenom, s.nom AS student_nom, s.niveau
     FROM madrasa_bulletins b
     JOIN madrasa_students s ON s.id = b.student_id
     WHERE b.tenant_code = :tc ${periode ? "AND b.periode = :per" : ""}
     ORDER BY b.periode, s.nom`,
    { replacements: { tc, per: periode } }
  );
  res.json({ bulletins });
});

router.post('/:tenantCode/bulletins/generate', authenticate, verifyTenant, async (req, res) => {
  const tc = req.params.tenantCode;
  const { periode, annee, publish } = req.body;
  if (!periode) return res.status(400).json({ message: 'Période requise.' });

  const MENTIONS = [
    { min: 18, label: 'Excellent — ممتاز' },
    { min: 16, label: 'Très bien — جيد جداً' },
    { min: 14, label: 'Bien — جيد' },
    { min: 12, label: 'Assez bien — مقبول' },
    { min: 10, label: 'Passable — ضعيف' },
    { min:  0, label: 'Insuffisant — غير مقبول' },
  ];

  const [students] = await sequelize.query(
    `SELECT * FROM madrasa_students WHERE tenant_code = :tc AND is_active = true`,
    { replacements: { tc } }
  );

  let generated = 0;
  for (const s of students) {
    const [grades] = await sequelize.query(
      `SELECT * FROM madrasa_grades WHERE tenant_code = :tc AND student_id = :sid AND periode = :per`,
      { replacements: { tc, sid: s.id, per: periode } }
    );
    if (!grades.length) continue;

    const total = grades.reduce((sum, g) => sum + (g.note / g.note_max) * 20, 0);
    const moyenne = parseFloat((total / grades.length).toFixed(2));
    const mention = MENTIONS.find(m => moyenne >= m.min)?.label || 'Insuffisant';

    await sequelize.query(
      `INSERT INTO madrasa_bulletins (tenant_code, student_id, periode, annee_scolaire, moyenne_generale, mention, is_published, published_at)
       VALUES (:tc, :sid, :per, :ann, :moy, :men, :pub, :pat)
       ON CONFLICT (tenant_code, student_id, periode) DO UPDATE
       SET moyenne_generale = EXCLUDED.moyenne_generale, mention = EXCLUDED.mention,
           is_published = EXCLUDED.is_published, published_at = EXCLUDED.published_at`,
      { replacements: { tc, sid: s.id, per: periode, ann: annee || '2025-2026', moy: moyenne, men: mention, pub: !!publish, pat: publish ? new Date() : null } }
    );

    if (publish) {
      // Notifier membres liés
      const [linkedMembers] = await sequelize.query(
        `SELECT numero_h FROM madrasa_members WHERE tenant_code = :tc AND (linked_student_id = :sid OR numero_h = :snh) AND is_active = true`,
        { replacements: { tc, sid: s.id, snh: s.numero_h || '' } }
      );
      for (const m of linkedMembers) {
        await sequelize.query(
          `INSERT INTO notifications (user_id, type, message) VALUES (:uid, 'bulletin', :msg)`,
          { replacements: { uid: m.numero_h, msg: `📋 Bulletin de ${s.prenom} ${s.nom} pour ${periode} disponible — Moyenne : ${moyenne}/20 (${mention})` } }
        ).catch(() => {});
      }
    }
    generated++;
  }
  res.json({ success: true, generated });
});

router.put('/:tenantCode/bulletins/:id/publish', authenticate, verifyTenant, async (req, res) => {
  const tc = req.params.tenantCode;
  await sequelize.query(
    `UPDATE madrasa_bulletins SET is_published = true, published_at = NOW() WHERE id = :id AND tenant_code = :tc`,
    { replacements: { id: req.params.id, tc } }
  );
  // Récupérer pour notifier
  const [rows] = await sequelize.query(
    `SELECT b.*, s.prenom, s.nom, s.numero_h AS student_nh
     FROM madrasa_bulletins b JOIN madrasa_students s ON s.id = b.student_id
     WHERE b.id = :id`, { replacements: { id: req.params.id } }
  );
  if (rows.length) {
    const b = rows[0];
    const [linked] = await sequelize.query(
      `SELECT numero_h FROM madrasa_members WHERE tenant_code = :tc AND (linked_student_id = :sid OR numero_h = :snh) AND is_active = true`,
      { replacements: { tc, sid: b.student_id, snh: b.student_nh || '' } }
    );
    for (const m of linked) {
      await sequelize.query(
        `INSERT INTO notifications (user_id, type, message) VALUES (:uid, 'bulletin', :msg)`,
        { replacements: { uid: m.numero_h, msg: `📋 Bulletin de ${b.prenom} ${b.nom} (${b.periode}) publié — Moyenne : ${b.moyenne_generale}/20` } }
      ).catch(() => {});
    }
  }
  res.json({ success: true });
});

export default router;
