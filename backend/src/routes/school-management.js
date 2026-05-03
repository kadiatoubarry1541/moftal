import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { sequelize } from '../config/database.js';

const router = express.Router();

async function verifyTenant(req, res, next) {
  const { tenantCode } = req.params;
  const isAdminUser = !!(req.user?.isMasterAdmin || req.user?.isAdmin);
  try {
    const [tenant] = isAdminUser
      ? await sequelize.query(
          `SELECT * FROM management_tenants WHERE tenant_code = :code LIMIT 1`,
          { replacements: { code: tenantCode }, type: sequelize.QueryTypes.SELECT }
        )
      : await sequelize.query(
          `SELECT * FROM management_tenants WHERE tenant_code = :code AND owner_numero_h = :n LIMIT 1`,
          { replacements: { code: tenantCode, n: req.userId }, type: sequelize.QueryTypes.SELECT }
        );
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
    const [stu]  = await sequelize.query(`SELECT COUNT(*) as c FROM school_students WHERE tenant_code=:code AND statut='actif'`, { replacements: { code }, type: sequelize.QueryTypes.SELECT });
    const [sta]  = await sequelize.query(`SELECT COUNT(*) as c FROM school_staff WHERE tenant_code=:code AND is_active=true`, { replacements: { code }, type: sequelize.QueryTypes.SELECT });
    const [cls]  = await sequelize.query(`SELECT COUNT(*) as c FROM school_classrooms WHERE tenant_code=:code`, { replacements: { code }, type: sequelize.QueryTypes.SELECT });
    const [fees] = await sequelize.query(`SELECT COALESCE(SUM(montant-montant_paye),0) as t FROM school_fees WHERE tenant_code=:code AND est_paye=false`, { replacements: { code }, type: sequelize.QueryTypes.SELECT });
    const recent = await sequelize.query(`SELECT * FROM school_students WHERE tenant_code=:code ORDER BY created_at DESC LIMIT 6`, { replacements: { code }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, stats: { students: +stu.c, staff: +sta.c, classrooms: +cls.c, feesPending: +fees.t }, recentStudents: recent });
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

export default router;
