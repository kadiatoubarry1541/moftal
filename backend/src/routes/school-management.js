import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { sequelize } from '../config/database.js';

const router = express.Router();

async function verifyTenant(req, res, next) {
  const { tenantCode } = req.params;
  const role = req.user?.role || '';
  const isAdminUser = !!(req.user?.isMasterAdmin || role === 'admin' || role === 'super-admin');
  try {
    if (isAdminUser) {
      const [tenant] = await sequelize.query(`SELECT * FROM management_tenants WHERE tenant_code = :code LIMIT 1`, { replacements: { code: tenantCode }, type: sequelize.QueryTypes.SELECT });
      req.tenant = tenant || { tenant_code: tenantCode, name: 'École Admin', type: 'school', owner_numero_h: 'ADMIN-G7', is_active: true };
      return next();
    }
    const [tenant] = await sequelize.query(`SELECT * FROM management_tenants WHERE tenant_code = :code AND owner_numero_h = :n LIMIT 1`, { replacements: { code: tenantCode, n: req.userId }, type: sequelize.QueryTypes.SELECT });
    if (!tenant) return res.status(403).json({ success: false, message: 'Accès refusé à cet espace école.' });
    req.tenant = tenant;
    next();
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}

// GET /info
router.get('/:tenantCode/info', authenticate, verifyTenant, async (req, res) => {
  res.json({ success: true, tenant: req.tenant });
});

// PUT /:tenantCode/settings — mise à jour nom, logo, contact
router.put('/:tenantCode/settings', authenticate, verifyTenant, async (req, res) => {
  try {
    const { name, logo_url, address, phone, email, description } = req.body;
    const code = req.params.tenantCode;
    await sequelize.query(
      `UPDATE management_tenants SET
        name        = COALESCE(:name, name),
        logo_url    = :logo,
        address     = :address,
        phone       = :phone,
        email       = :email,
        description = :desc
       WHERE tenant_code = :code`,
      { replacements: { name: name || null, logo: logo_url || null, address: address || null, phone: phone || null, email: email || null, desc: description || null, code } }
    );
    const [updated] = await sequelize.query(
      `SELECT * FROM management_tenants WHERE tenant_code = :code LIMIT 1`,
      { replacements: { code }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, tenant: updated });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET /dashboard
router.get('/:tenantCode/dashboard', authenticate, verifyTenant, async (req, res) => {
  try {
    const code = req.params.tenantCode;
    const q = (sql, rep) => sequelize.query(sql, { replacements: rep, type: sequelize.QueryTypes.SELECT }).then(r => r[0]).catch(() => ({ c: 0, t: 0 }));
    const [stu, sta, cls, fees, recent] = await Promise.all([
      q(`SELECT COUNT(*) as c FROM school_students WHERE tenant_code=:code AND statut='actif'`, { code }),
      q(`SELECT COUNT(*) as c FROM school_staff WHERE tenant_code=:code AND is_active=true`, { code }),
      q(`SELECT COUNT(*) as c FROM school_classrooms WHERE tenant_code=:code`, { code }),
      q(`SELECT COALESCE(SUM(montant-montant_paye),0) as t FROM school_fees WHERE tenant_code=:code AND est_paye=false`, { code }),
      sequelize.query(`SELECT * FROM school_students WHERE tenant_code=:code ORDER BY created_at DESC LIMIT 6`, { replacements: { code }, type: sequelize.QueryTypes.SELECT }).catch(() => []),
    ]);
    res.json({ success: true, stats: { students: +(stu.c||0), staff: +(sta.c||0), classrooms: +(cls.c||0), feesPending: +(fees.t||0) }, recentStudents: recent });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── ÉLÈVES ──────────────────────────────────────────────────────────────────

router.get('/:tenantCode/students', authenticate, verifyTenant, async (req, res) => {
  try {
    const { search, classroom_id } = req.query;
    let q = `SELECT s.*,c.nom as classe FROM school_students s LEFT JOIN school_classrooms c ON s.classroom_id=c.id WHERE s.tenant_code=:code AND s.statut='actif'`;
    if (search) q += ` AND (s.nom ILIKE :s OR s.prenom ILIKE :s OR s.numero_matricule ILIKE :s)`;
    if (classroom_id) q += ` AND s.classroom_id=:cid`;
    q += ` ORDER BY s.nom`;
    const rows = await sequelize.query(q, { replacements: { code: req.params.tenantCode, s: `%${search || ''}%`, cid: classroom_id || null }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, students: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/students', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, prenom, date_naissance, sexe, telephone_parent, nom_parent, adresse, classroom_id } = req.body;
    const code = req.params.tenantCode;
    const [cnt] = await sequelize.query(`SELECT COUNT(*) as c FROM school_students WHERE tenant_code=:code`, { replacements: { code }, type: sequelize.QueryTypes.SELECT });
    const mat = `ELV-${code.slice(-4)}-${new Date().getFullYear()}-${String(+cnt.c + 1).padStart(4, '0')}`;
    const [rows] = await sequelize.query(
      `INSERT INTO school_students (tenant_code,nom,prenom,date_naissance,sexe,telephone_parent,nom_parent,adresse,classroom_id,numero_matricule) VALUES(:code,:nom,:prenom,:dob,:sexe,:tel,:parent,:adr,:cid,:mat) RETURNING *`,
      { replacements: { code, nom, prenom, dob: date_naissance || null, sexe, tel: telephone_parent, parent: nom_parent, adr: adresse, cid: classroom_id || null, mat }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true, student: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:tenantCode/students/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, prenom, date_naissance, sexe, telephone_parent, nom_parent, adresse, classroom_id, statut } = req.body;
    await sequelize.query(
      `UPDATE school_students SET nom=:nom,prenom=:prenom,date_naissance=:dob,sexe=:sexe,telephone_parent=:tel,nom_parent=:parent,adresse=:adr,classroom_id=:cid,statut=:statut WHERE id=:id AND tenant_code=:code`,
      { replacements: { nom, prenom, dob: date_naissance || null, sexe, tel: telephone_parent, parent: nom_parent, adr: adresse, cid: classroom_id || null, statut: statut || 'actif', id: req.params.id, code: req.params.tenantCode } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/students/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`UPDATE school_students SET statut='inactif' WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── PERSONNEL ───────────────────────────────────────────────────────────────

router.get('/:tenantCode/staff', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(`SELECT * FROM school_staff WHERE tenant_code=:code AND is_active=true ORDER BY nom`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, staff: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/staff', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, prenom, role, matieres, telephone, email } = req.body;
    const code = req.params.tenantCode;
    const [cnt] = await sequelize.query(`SELECT COUNT(*) as c FROM school_staff WHERE tenant_code=:code`, { replacements: { code }, type: sequelize.QueryTypes.SELECT });
    const mat = `PROF-${code.slice(-4)}-${String(+cnt.c + 1).padStart(3, '0')}`;
    const [rows] = await sequelize.query(
      `INSERT INTO school_staff (tenant_code,nom,prenom,role,matieres,telephone,email,matricule) VALUES(:code,:nom,:prenom,:role,:mats::jsonb,:tel,:email,:mat) RETURNING *`,
      { replacements: { code, nom, prenom, role, mats: JSON.stringify(matieres || []), tel: telephone, email, mat }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true, staff: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/staff/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`UPDATE school_staff SET is_active=false WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── CLASSES ─────────────────────────────────────────────────────────────────

router.get('/:tenantCode/classrooms', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT c.*,s.nom as prof_nom,s.prenom as prof_prenom,COUNT(st.id)::int as nb_eleves FROM school_classrooms c LEFT JOIN school_staff s ON c.professeur_principal_id=s.id LEFT JOIN school_students st ON st.classroom_id=c.id AND st.statut='actif' WHERE c.tenant_code=:code GROUP BY c.id,s.nom,s.prenom ORDER BY c.nom`,
      { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, classrooms: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/classrooms', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, niveau, capacite, professeur_principal_id } = req.body;
    const [rows] = await sequelize.query(
      `INSERT INTO school_classrooms (tenant_code,nom,niveau,capacite,professeur_principal_id) VALUES(:code,:nom,:niveau,:cap,:prof) RETURNING *`,
      { replacements: { code: req.params.tenantCode, nom, niveau, cap: capacite || 30, prof: professeur_principal_id || null }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true, classroom: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/classrooms/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`DELETE FROM school_classrooms WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── PRÉSENCES ───────────────────────────────────────────────────────────────

router.get('/:tenantCode/attendance', authenticate, verifyTenant, async (req, res) => {
  try {
    const { date, classroom_id } = req.query;
    const d = date || new Date().toISOString().split('T')[0];
    let q = `SELECT a.*,s.nom,s.prenom,s.numero_matricule FROM school_attendance a LEFT JOIN school_students s ON a.student_id=s.id WHERE a.tenant_code=:code AND a.date_presence=:date`;
    if (classroom_id) q += ` AND a.classroom_id=:cid`;
    const rows = await sequelize.query(q, { replacements: { code: req.params.tenantCode, date: d, cid: classroom_id || null }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, records: rows, date: d });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/attendance', authenticate, verifyTenant, async (req, res) => {
  try {
    const { records, classroom_id } = req.body;
    const code = req.params.tenantCode;
    const date = new Date().toISOString().split('T')[0];
    await sequelize.query(`DELETE FROM school_attendance WHERE tenant_code=:code AND date_presence=:date AND classroom_id=:cid`, { replacements: { code, date, cid: classroom_id } });
    for (const r of records || []) {
      await sequelize.query(
        `INSERT INTO school_attendance (tenant_code,student_id,classroom_id,date_presence,est_present,motif_absence) VALUES(:code,:sid,:cid,:date,:present,:motif)`,
        { replacements: { code, sid: r.student_id, cid: classroom_id, date, present: r.est_present !== false, motif: r.motif_absence || null } }
      );
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── NOTES ───────────────────────────────────────────────────────────────────

router.get('/:tenantCode/grades', authenticate, verifyTenant, async (req, res) => {
  try {
    const { student_id, classroom_id, periode } = req.query;
    let q = `SELECT g.*,s.nom,s.prenom FROM school_grades g LEFT JOIN school_students s ON g.student_id=s.id WHERE g.tenant_code=:code`;
    if (student_id) q += ` AND g.student_id=:sid`;
    if (classroom_id) q += ` AND g.classroom_id=:cid`;
    if (periode) q += ` AND g.periode=:periode`;
    const rows = await sequelize.query(q, { replacements: { code: req.params.tenantCode, sid: student_id, cid: classroom_id, periode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, grades: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/grades', authenticate, verifyTenant, async (req, res) => {
  try {
    const { student_id, classroom_id, matiere, note, note_max, coefficient, periode, commentaire } = req.body;
    const [rows] = await sequelize.query(
      `INSERT INTO school_grades (tenant_code,student_id,classroom_id,matiere,note,note_max,coefficient,periode,commentaire) VALUES(:code,:sid,:cid,:mat,:note,:nmax,:coeff,:periode,:comm) RETURNING *`,
      { replacements: { code: req.params.tenantCode, sid: student_id, cid: classroom_id || null, mat: matiere, note, nmax: note_max || 20, coeff: coefficient || 1, periode, comm: commentaire }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true, grade: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── FRAIS SCOLAIRES ─────────────────────────────────────────────────────────

router.get('/:tenantCode/fees', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT f.*,s.nom,s.prenom,s.numero_matricule FROM school_fees f LEFT JOIN school_students s ON f.student_id=s.id WHERE f.tenant_code=:code ORDER BY f.created_at DESC`,
      { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, fees: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/fees', authenticate, verifyTenant, async (req, res) => {
  try {
    const { student_id, montant, type_frais, periode } = req.body;
    const [rows] = await sequelize.query(
      `INSERT INTO school_fees (tenant_code,student_id,montant,type_frais,periode) VALUES(:code,:sid,:montant,:type,:periode) RETURNING *`,
      { replacements: { code: req.params.tenantCode, sid: student_id, montant, type: type_frais, periode }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true, fee: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:tenantCode/fees/:id/pay', authenticate, verifyTenant, async (req, res) => {
  try {
    const { montant_paye } = req.body;
    await sequelize.query(
      `UPDATE school_fees SET montant_paye=:mp,est_paye=(:mp>=montant),date_paiement=CURRENT_DATE WHERE id=:id AND tenant_code=:code`,
      { replacements: { mp: montant_paye, id: req.params.id, code: req.params.tenantCode } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});


// ─── MIDDLEWARE MEMBRE ────────────────────────────────────────────────────────

async function verifyMember(req, res, next) {
  const { tenantCode } = req.params;
  try {
    const [tenant] = await sequelize.query(
      `SELECT * FROM management_tenants WHERE tenant_code=:code LIMIT 1`,
      { replacements: { code: tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    if (!tenant) return res.status(404).json({ success: false, message: 'Espace introuvable.' });
    req.tenant = tenant;
    if (tenant.owner_numero_h === req.userId) {
      req.member = { role: 'directeur', numero_h: req.userId };
      return next();
    }
    const [member] = await sequelize.query(
      `SELECT * FROM school_members WHERE tenant_code=:code AND numero_h=:n AND is_active=true LIMIT 1`,
      { replacements: { code: tenantCode, n: req.userId }, type: sequelize.QueryTypes.SELECT }
    );
    if (!member) return res.status(403).json({ success: false, message: 'Vous n\'êtes pas membre de cet établissement.' });
    req.member = member;
    next();
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}

// ─── MEMBRES (par numéroH) ────────────────────────────────────────────────────

router.get('/:tenantCode/members', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT m.*,u.prenom,u.nom,u.photo FROM school_members m LEFT JOIN users u ON m.numero_h=u."numeroH" WHERE m.tenant_code=:code AND m.is_active=true ORDER BY m.role,m.created_at`,
      { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, members: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/members/add', authenticate, verifyTenant, async (req, res) => {
  try {
    const { numero_h, role, linked_student_id } = req.body;
    const code = req.params.tenantCode;
    const [user] = await sequelize.query(
      `SELECT "numeroH", prenom, nom FROM users WHERE "numeroH"=:n LIMIT 1`,
      { replacements: { n: numero_h }, type: sequelize.QueryTypes.SELECT }
    );
    if (!user) return res.status(404).json({ success: false, message: `Aucun utilisateur avec le numéroH : ${numero_h}` });
    const nom_display = `${user.prenom} ${user.nom}`;
    const [rows] = await sequelize.query(
      `INSERT INTO school_members (tenant_code,numero_h,role,linked_student_id,nom_display,added_by)
       VALUES(:code,:n,:role,:sid,:nom,:by)
       ON CONFLICT(tenant_code,numero_h) DO UPDATE SET role=EXCLUDED.role,linked_student_id=EXCLUDED.linked_student_id,is_active=true
       RETURNING *`,
      { replacements: { code, n: numero_h, role: role || 'parent', sid: linked_student_id || null, nom: nom_display, by: req.userId }, type: sequelize.QueryTypes.INSERT }
    );
    await sequelize.query(
      `INSERT INTO notifications (user_id, type, message) VALUES(:uid,'school_member',:msg) ON CONFLICT DO NOTHING`,
      { replacements: { uid: numero_h, msg: `Vous avez été ajouté(e) à l'établissement "${req.tenant.name}" (rôle : ${role || 'parent'}).` } }
    ).catch(() => {});
    res.json({ success: true, member: rows[0], user: { prenom: user.prenom, nom: user.nom } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/members/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(
      `UPDATE school_members SET is_active=false WHERE id=:id AND tenant_code=:code`,
      { replacements: { id: req.params.id, code: req.params.tenantCode } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET /:tenantCode/my-access — accès du membre connecté
router.get('/:tenantCode/my-access', authenticate, verifyMember, async (req, res) => {
  try {
    const code = req.params.tenantCode;
    const member = req.member;
    const tenant = req.tenant;
    let data = {};

    if (member.role === 'apprenant' || member.role === 'parent') {
      const studentId = member.linked_student_id;
      if (studentId) {
        const [student] = await sequelize.query(
          `SELECT s.*,c.nom as classe FROM school_students s LEFT JOIN school_classrooms c ON s.classroom_id=c.id WHERE s.id=:id LIMIT 1`,
          { replacements: { id: studentId }, type: sequelize.QueryTypes.SELECT }
        );
        const grades = await sequelize.query(
          `SELECT * FROM school_grades WHERE student_id=:sid ORDER BY created_at DESC LIMIT 50`,
          { replacements: { sid: studentId }, type: sequelize.QueryTypes.SELECT }
        );
        const attendance = await sequelize.query(
          `SELECT * FROM school_attendance WHERE student_id=:sid ORDER BY date_presence DESC LIMIT 30`,
          { replacements: { sid: studentId }, type: sequelize.QueryTypes.SELECT }
        );
        const fees = await sequelize.query(
          `SELECT * FROM school_fees WHERE student_id=:sid ORDER BY created_at DESC`,
          { replacements: { sid: studentId }, type: sequelize.QueryTypes.SELECT }
        );
        const bulletins = await sequelize.query(
          `SELECT b.*,g.matiere,g.note,g.note_max,g.coefficient,g.periode as g_periode FROM school_bulletins b LEFT JOIN school_grades g ON g.student_id=b.student_id AND g.periode=b.periode WHERE b.student_id=:sid AND b.is_published=true ORDER BY b.created_at DESC`,
          { replacements: { sid: studentId }, type: sequelize.QueryTypes.SELECT }
        );
        data = { student: student || null, grades, attendance, fees, bulletins };
      }
    }

    res.json({ success: true, role: member.role, member, tenant: { name: tenant.name, logo_url: tenant.logo_url, address: tenant.address, phone: tenant.phone }, ...data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── BULLETINS ────────────────────────────────────────────────────────────────

router.get('/:tenantCode/bulletins', authenticate, verifyTenant, async (req, res) => {
  try {
    const { periode, student_id } = req.query;
    let q = `SELECT b.*,s.nom,s.prenom,s.numero_matricule,c.nom as classe FROM school_bulletins b LEFT JOIN school_students s ON b.student_id=s.id LEFT JOIN school_classrooms c ON s.classroom_id=c.id WHERE b.tenant_code=:code`;
    if (periode)    q += ` AND b.periode=:periode`;
    if (student_id) q += ` AND b.student_id=:sid`;
    q += ` ORDER BY s.nom`;
    const rows = await sequelize.query(q, { replacements: { code: req.params.tenantCode, periode, sid: student_id }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, bulletins: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/bulletins/generate', authenticate, verifyTenant, async (req, res) => {
  try {
    const { periode, annee_scolaire, publish = false } = req.body;
    const code = req.params.tenantCode;
    const students = await sequelize.query(
      `SELECT * FROM school_students WHERE tenant_code=:code AND statut='actif'`,
      { replacements: { code }, type: sequelize.QueryTypes.SELECT }
    );
    const calcMention = (m) => !m ? '—' : m >= 18 ? 'Excellent' : m >= 16 ? 'Très bien' : m >= 14 ? 'Bien' : m >= 12 ? 'Assez bien' : m >= 10 ? 'Passable' : 'Insuffisant';
    const generated = [];
    for (const student of students) {
      const grades = await sequelize.query(
        `SELECT note, note_max, coefficient FROM school_grades WHERE student_id=:sid AND periode=:p`,
        { replacements: { sid: student.id, p: periode }, type: sequelize.QueryTypes.SELECT }
      );
      let pts = 0, coeff = 0;
      for (const g of grades) {
        if (g.note != null && g.note_max) { pts += (g.note / g.note_max) * 20 * (g.coefficient || 1); coeff += (g.coefficient || 1); }
      }
      const moy = coeff > 0 ? Math.round((pts / coeff) * 100) / 100 : null;
      const [rows] = await sequelize.query(
        `INSERT INTO school_bulletins (tenant_code,student_id,periode,annee_scolaire,moyenne_generale,mention,is_published,published_at,effectif)
         VALUES(:code,:sid,:p,:annee,:moy,:mention,:pub,CASE WHEN :pub THEN NOW() ELSE NULL END,:eff)
         ON CONFLICT(tenant_code,student_id,periode) DO UPDATE SET moyenne_generale=:moy,mention=:mention,is_published=:pub,published_at=CASE WHEN :pub THEN NOW() ELSE school_bulletins.published_at END
         RETURNING *`,
        { replacements: { code, sid: student.id, p: periode, annee: annee_scolaire || '', moy, mention: calcMention(moy), pub: !!publish, eff: students.length }, type: sequelize.QueryTypes.INSERT }
      );
      generated.push(rows[0]);
      if (publish) {
        const members = await sequelize.query(
          `SELECT numero_h FROM school_members WHERE tenant_code=:code AND linked_student_id=:sid AND is_active=true`,
          { replacements: { code, sid: student.id }, type: sequelize.QueryTypes.SELECT }
        );
        for (const m of members) {
          await sequelize.query(
            `INSERT INTO notifications (user_id, type, message) VALUES(:uid,'bulletin',:msg)`,
            { replacements: { uid: m.numero_h, msg: `📊 Bulletin du ${periode} disponible — ${student.prenom} ${student.nom} : ${moy ? moy + '/20' : '—'} (${calcMention(moy)})` } }
          ).catch(() => {});
        }
      }
    }
    res.json({ success: true, generated: generated.length, bulletins: generated });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:tenantCode/bulletins/:id/publish', authenticate, verifyTenant, async (req, res) => {
  try {
    const [bulletin] = await sequelize.query(
      `UPDATE school_bulletins SET is_published=true,published_at=NOW() WHERE id=:id AND tenant_code=:code RETURNING student_id,periode,moyenne_generale,mention`,
      { replacements: { id: req.params.id, code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    if (bulletin) {
      const members = await sequelize.query(
        `SELECT numero_h FROM school_members WHERE tenant_code=:code AND linked_student_id=:sid AND is_active=true`,
        { replacements: { code: req.params.tenantCode, sid: bulletin.student_id }, type: sequelize.QueryTypes.SELECT }
      );
      for (const m of members) {
        await sequelize.query(
          `INSERT INTO notifications (user_id, type, message) VALUES(:uid,'bulletin',:msg)`,
          { replacements: { uid: m.numero_h, msg: `📊 Nouveau bulletin disponible — ${bulletin.periode} : ${bulletin.moyenne_generale ? bulletin.moyenne_generale + '/20' : '—'} (${bulletin.mention})` } }
        ).catch(() => {});
      }
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;
