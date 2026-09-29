import express from 'express';
import { syncAccountFromTenant } from '../utils/tenantSync.js';
import { authenticate } from '../middleware/auth.js';
import { sequelize } from '../config/database.js';
import { notifier } from '../utils/notifier.js';
import { trouverUtilisateur, MESSAGE_INTROUVABLE } from '../utils/trouverUtilisateur.js';
import { enforceGestionAccess } from '../middleware/gestionAccessGuard.js';
import { ensureTenantExtraColumns } from './clinic-management.js';
import { verifyDirecteurOuEnseignant, exigerDroit, elevesAutorises, peutVoirEleve, peutVoirClasse, descriptionAcces, preparerAcces, appliquerAcces, ensureColonnesAcces } from '../utils/accesEnseignant.js';

// Directeur (tout) ou enseignant ayant reçu l'accès (seulement ses classes)
const verifyAcces = verifyDirecteurOuEnseignant('school');

const router = express.Router();

async function ensureStaffPhotoColumn() {
  await sequelize.query(`ALTER TABLE school_staff ADD COLUMN IF NOT EXISTS photo_url TEXT;`);
}

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
    return enforceGestionAccess(req, res, next);
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}

// GET /info
router.get('/:tenantCode/info', authenticate, verifyAcces, async (req, res) => {
  res.json({ success: true, tenant: req.tenant, acces: descriptionAcces(req) });
});

// GET /api/school-mgmt/enseignant/mes-etablissements — les écoles où j'enseigne
router.get('/enseignant/mes-etablissements', authenticate, async (req, res) => {
  try {
    await ensureColonnesAcces('school');
    const rows = await sequelize.query(
      `SELECT mt.tenant_code, mt.name, mt.logo_url, 'school' AS type FROM school_staff s
       JOIN management_tenants mt ON mt.tenant_code = s.tenant_code
       WHERE s.numero_h = :n AND s.acces_actif = true AND s.is_active = true ORDER BY mt.name`,
      { replacements: { n: req.userId }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, etablissements: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// PUT /:tenantCode/settings — mise à jour nom, logo, contact
router.put('/:tenantCode/settings', authenticate, verifyTenant, async (req, res) => {
  try {
    await ensureTenantExtraColumns();
    const { name, logo_url, address, phone, email, description, horaires, phone_urgence } = req.body;
    const code = req.params.tenantCode;
    await sequelize.query(
      `UPDATE management_tenants SET
        name          = COALESCE(:name, name),
        logo_url      = CASE WHEN :hasLogo THEN :logo ELSE logo_url END,
        address       = :address,
        phone         = :phone,
        email         = :email,
        description   = :desc,
        horaires      = :horaires,
        phone_urgence = :phone_urgence
       WHERE tenant_code = :code`,
      { replacements: { name: name || null, hasLogo: logo_url !== undefined, logo: logo_url || null, address: address || null, phone: phone || null, email: email || null, desc: description || null, horaires: horaires || null, phone_urgence: phone_urgence || null, code } }
    );
    const [updated] = await sequelize.query(
      `SELECT * FROM management_tenants WHERE tenant_code = :code LIMIT 1`,
      { replacements: { code }, type: sequelize.QueryTypes.SELECT }
    );
    await syncAccountFromTenant(req.params.tenantCode);
    res.json({ success: true, tenant: updated });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET /dashboard
router.get('/:tenantCode/dashboard', authenticate, verifyTenant, async (req, res) => {
  try {
    const code = req.params.tenantCode;
    const q = (sql, rep) => sequelize.query(sql, { replacements: rep, type: sequelize.QueryTypes.SELECT }).then(r => r[0]).catch(() => ({ c: 0, t: 0 }));
    const [stu, sta, cls, fees, recent, pres, coll, impayes] = await Promise.all([
      q(`SELECT COUNT(*) as c FROM school_students WHERE tenant_code=:code AND statut='actif'`, { code }),
      q(`SELECT COUNT(*) as c FROM school_staff WHERE tenant_code=:code AND is_active=true`, { code }),
      q(`SELECT COUNT(*) as c FROM school_classrooms WHERE tenant_code=:code`, { code }),
      q(`SELECT COALESCE(SUM(montant-COALESCE(montant_paye,0)),0) as t FROM school_fees WHERE tenant_code=:code AND est_paye=false`, { code }),
      sequelize.query(`SELECT * FROM school_students WHERE tenant_code=:code ORDER BY created_at DESC LIMIT 6`, { replacements: { code }, type: sequelize.QueryTypes.SELECT }).catch(() => []),
      q(`SELECT COUNT(*) as c FROM school_attendance WHERE tenant_code=:code AND date_presence=CURRENT_DATE AND COALESCE(statut, CASE WHEN est_present THEN 'present' ELSE 'absent' END) <> 'absent'`, { code }),
      q(`SELECT COALESCE(SUM(COALESCE(montant_paye,montant)),0) as t FROM school_fees WHERE tenant_code=:code AND est_paye=true AND date_paiement>=date_trunc('month',CURRENT_DATE)`, { code }),
      q(`SELECT COUNT(DISTINCT student_id) as c FROM school_fees WHERE tenant_code=:code AND est_paye=false`, { code }),
    ]);
    // Mêmes noms que la madrasa : c'est ce que lit le tableau de bord (avant, il affichait 0 partout)
    res.json({
      success: true,
      totalStudents: +(stu.c||0), totalStaff: +(sta.c||0), totalClassrooms: +(cls.c||0),
      presentToday: +(pres.c||0), feesCollected: +(coll.t||0), unpaidFees: +(impayes.c||0), feesPending: +(fees.t||0),
      stats: { students: +(stu.c||0), staff: +(sta.c||0), classrooms: +(cls.c||0), feesPending: +(fees.t||0) }, recentStudents: recent,
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── ÉLÈVES ──────────────────────────────────────────────────────────────────

router.get('/:tenantCode/students', authenticate, verifyAcces, async (req, res) => {
  try {
    const { search, classroom_id } = req.query;
    const ids = await elevesAutorises('school', req); // enseignant : ses élèves seulement
    let q = `SELECT s.*,c.nom as classe FROM school_students s LEFT JOIN school_classrooms c ON s.classroom_id=c.id WHERE s.tenant_code=:code AND s.statut='actif'`;
    if (ids) q += ids.length ? ` AND s.id IN (:ids)` : ` AND false`;
    if (search) q += ` AND (s.nom ILIKE :s OR s.prenom ILIKE :s OR s.numero_matricule ILIKE :s)`;
    if (classroom_id) q += ` AND s.classroom_id=:cid`;
    q += ` ORDER BY s.nom`;
    const rows = await sequelize.query(q, { replacements: { code: req.params.tenantCode, s: `%${search || ''}%`, cid: classroom_id || null, ids: ids?.length ? ids : [0] }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, students: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/students', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, prenom, date_naissance, sexe, telephone_parent, nom_parent, adresse, classroom_id, niveau, numero_h, parent_numero_h } = req.body;
    if (!nom || !prenom) return res.status(400).json({ success: false, message: 'Nom et prénom obligatoires.' });
    const code = req.params.tenantCode;
    const [cnt] = await sequelize.query(`SELECT COUNT(*) as c FROM school_students WHERE tenant_code=:code`, { replacements: { code }, type: sequelize.QueryTypes.SELECT });
    const mat = `ELV-${code.slice(-4)}-${new Date().getFullYear()}-${String(+cnt.c + 1).padStart(4, '0')}`;
    const [rows] = await sequelize.query(
      `INSERT INTO school_students (tenant_code,nom,prenom,date_naissance,sexe,telephone_parent,nom_parent,adresse,classroom_id,numero_matricule,niveau,numero_h,parent_numero_h) VALUES(:code,:nom,:prenom,:dob,:sexe,:tel,:parent,:adr,:cid,:mat,:niveau,:nh,:pnh) RETURNING *`,
      { replacements: { code, nom, prenom, dob: date_naissance || null, sexe: sexe || 'M', tel: telephone_parent || null, parent: nom_parent || null, adr: adresse || null, cid: classroom_id || null, mat, niveau: niveau || null, nh: numero_h?.trim() || null, pnh: parent_numero_h?.trim() || null }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true, student: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:tenantCode/students/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    const b = req.body;
    // Un champ absent du formulaire garde sa valeur (pas d'effacement silencieux).
    const keep = (k) => (Object.prototype.hasOwnProperty.call(b, k) ? (b[k] === '' ? null : b[k]) : undefined);
    await sequelize.query(
      `UPDATE school_students SET
         nom=COALESCE(:nom,nom), prenom=COALESCE(:prenom,prenom),
         date_naissance=CASE WHEN :has_dob THEN CAST(:dob AS DATE) ELSE date_naissance END,
         sexe=COALESCE(:sexe,sexe),
         telephone_parent=CASE WHEN :has_tel THEN :tel ELSE telephone_parent END,
         nom_parent=CASE WHEN :has_parent THEN :parent ELSE nom_parent END,
         adresse=CASE WHEN :has_adr THEN :adr ELSE adresse END,
         classroom_id=CASE WHEN :has_cid THEN CAST(:cid AS INTEGER) ELSE classroom_id END,
         niveau=CASE WHEN :has_niveau THEN :niveau ELSE niveau END,
         numero_h=CASE WHEN :has_nh THEN :nh ELSE numero_h END,
         parent_numero_h=CASE WHEN :has_pnh THEN :pnh ELSE parent_numero_h END,
         statut=COALESCE(:statut,statut)
       WHERE id=:id AND tenant_code=:code`,
      { replacements: {
          nom: b.nom || null, prenom: b.prenom || null, sexe: b.sexe || null, statut: b.statut || null,
          has_dob: keep('date_naissance') !== undefined, dob: keep('date_naissance') ?? null,
          has_tel: keep('telephone_parent') !== undefined, tel: keep('telephone_parent') ?? null,
          has_parent: keep('nom_parent') !== undefined, parent: keep('nom_parent') ?? null,
          has_adr: keep('adresse') !== undefined, adr: keep('adresse') ?? null,
          has_cid: keep('classroom_id') !== undefined, cid: keep('classroom_id') ?? null,
          has_niveau: keep('niveau') !== undefined, niveau: keep('niveau') ?? null,
          has_nh: keep('numero_h') !== undefined, nh: keep('numero_h') ?? null,
          has_pnh: keep('parent_numero_h') !== undefined, pnh: keep('parent_numero_h') ?? null,
          id: req.params.id, code: req.params.tenantCode,
        } }
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
    await ensureStaffPhotoColumn();
    const rows = await sequelize.query(`SELECT * FROM school_staff WHERE tenant_code=:code AND is_active=true ORDER BY nom`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, staff: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/staff', authenticate, verifyTenant, async (req, res) => {
  try {
    await ensureStaffPhotoColumn();
    const { nom, prenom, role, matieres, telephone, email, photo_url, specialite, numero_h } = req.body;
    if (!nom || !prenom) return res.status(400).json({ success: false, message: 'Nom et prénom obligatoires.' });
    const code = req.params.tenantCode;
    const acces = await preparerAcces(req.body); // vérifié avant d'enregistrer quoi que ce soit
    const [cnt] = await sequelize.query(`SELECT COUNT(*) as c FROM school_staff WHERE tenant_code=:code`, { replacements: { code }, type: sequelize.QueryTypes.SELECT });
    const mat = `PROF-${code.slice(-4)}-${String(+cnt.c + 1).padStart(3, '0')}`;
    const [rows] = await sequelize.query(
      `INSERT INTO school_staff (tenant_code,nom,prenom,role,matieres,telephone,email,matricule,photo_url,specialite,numero_h) VALUES(:code,:nom,:prenom,:role,:mats::jsonb,:tel,:email,:mat,:photo,:spec,:nh) RETURNING *`,
      { replacements: { code, nom, prenom, role: role || 'Enseignant', mats: JSON.stringify(matieres || (specialite ? [specialite] : [])), tel: telephone || null, email: email || null, mat, photo: photo_url || null, spec: specialite || null, nh: numero_h?.trim() || null }, type: sequelize.QueryTypes.INSERT }
    );
    await appliquerAcces('school', code, rows[0].id, acces, { nomEtablissement: req.tenant?.name });
    const [staff] = await sequelize.query(`SELECT * FROM school_staff WHERE id=:id`, { replacements: { id: rows[0].id }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, staff });
  } catch (e) { res.status(e.status || 500).json({ success: false, message: e.message }); }
});

router.put('/:tenantCode/staff/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await ensureStaffPhotoColumn();
    const { nom, prenom, role, matieres, telephone, email, photo_url, specialite, numero_h } = req.body;
    const acces = await preparerAcces(req.body);
    await ensureColonnesAcces('school');
    const [avant] = await sequelize.query(`SELECT acces_actif FROM school_staff WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    await sequelize.query(
      `UPDATE school_staff SET nom=COALESCE(:nom,nom),prenom=COALESCE(:prenom,prenom),role=COALESCE(:role,role),
         matieres=COALESCE(:mats::jsonb,matieres),telephone=:tel,email=COALESCE(:email,email),photo_url=COALESCE(:photo,photo_url),
         specialite=:spec,numero_h=:nh WHERE id=:id AND tenant_code=:code`,
      { replacements: { nom: nom || null, prenom: prenom || null, role: role || null, mats: matieres ? JSON.stringify(matieres) : (specialite ? JSON.stringify([specialite]) : null), tel: telephone || null, email: email || null, photo: photo_url || null, spec: specialite || null, nh: numero_h?.trim() || null, id: req.params.id, code: req.params.tenantCode } }
    );
    await appliquerAcces('school', req.params.tenantCode, req.params.id, acces, { nomEtablissement: req.tenant?.name, dejaActif: avant?.acces_actif });
    const [staff] = await sequelize.query(`SELECT * FROM school_staff WHERE id=:id`, { replacements: { id: req.params.id }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, staff });
  } catch (e) { res.status(e.status || 500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/staff/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await ensureColonnesAcces('school');
    await sequelize.query(`UPDATE school_staff SET is_active=false, acces_actif=false WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── CLASSES ─────────────────────────────────────────────────────────────────

router.get('/:tenantCode/classrooms', authenticate, verifyAcces, async (req, res) => {
  try {
    const rows = await sequelize.query(
      // Élèves de la classe : ceux qui y sont affectés, ou (sans affectation) ceux de son niveau
      `SELECT c.*,c.professeur_principal_id as professeur_id,s.nom as prof_nom,s.prenom as prof_prenom,
              COUNT(st.id)::int as nb_eleves, COUNT(st.id)::int as student_count
       FROM school_classrooms c
       LEFT JOIN school_staff s ON c.professeur_principal_id=s.id
       LEFT JOIN school_students st ON st.tenant_code=c.tenant_code AND st.statut='actif'
            AND (st.classroom_id=c.id OR (st.classroom_id IS NULL AND st.niveau=c.niveau))
       WHERE c.tenant_code=:code GROUP BY c.id,s.nom,s.prenom ORDER BY c.nom`,
      { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, classrooms: rows.filter(c => peutVoirClasse(req, c.id)) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/classrooms', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, niveau, capacite } = req.body;
    const professeur_principal_id = req.body.professeur_principal_id ?? req.body.professeur_id;
    const [rows] = await sequelize.query(
      `INSERT INTO school_classrooms (tenant_code,nom,niveau,capacite,professeur_principal_id) VALUES(:code,:nom,:niveau,:cap,:prof) RETURNING *`,
      { replacements: { code: req.params.tenantCode, nom, niveau, cap: capacite || 30, prof: professeur_principal_id || null }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true, classroom: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:tenantCode/classrooms/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, niveau, capacite } = req.body;
    const professeur_principal_id = req.body.professeur_principal_id ?? req.body.professeur_id;
    await sequelize.query(
      `UPDATE school_classrooms SET nom=:nom,niveau=:niveau,capacite=:cap,professeur_principal_id=:prof WHERE id=:id AND tenant_code=:code`,
      { replacements: { nom, niveau, cap: capacite || 30, prof: professeur_principal_id || null, id: req.params.id, code: req.params.tenantCode } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/classrooms/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`DELETE FROM school_classrooms WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Emploi du temps hebdomadaire d'une classe — tableau [{jour, heure_debut, heure_fin, matiere}]
router.put('/:tenantCode/classrooms/:id/schedule', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`ALTER TABLE school_classrooms ADD COLUMN IF NOT EXISTS emploi_du_temps JSONB DEFAULT '[]';`);
    const { emploi_du_temps } = req.body;
    await sequelize.query(
      `UPDATE school_classrooms SET emploi_du_temps=:edt::jsonb WHERE id=:id AND tenant_code=:code`,
      { replacements: { edt: JSON.stringify(emploi_du_temps || []), id: req.params.id, code: req.params.tenantCode } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── PRÉSENCES ───────────────────────────────────────────────────────────────

router.get('/:tenantCode/attendance', authenticate, verifyAcces, async (req, res) => {
  try {
    const { date, classroom_id } = req.query;
    const d = date || new Date().toISOString().split('T')[0];
    let q = `SELECT a.*, COALESCE(a.statut, CASE WHEN a.est_present THEN 'present' ELSE 'absent' END) AS statut,
                    s.nom, s.prenom, s.numero_matricule
             FROM school_attendance a LEFT JOIN school_students s ON a.student_id=s.id
             WHERE a.tenant_code=:code AND a.date_presence=:date`;
    if (classroom_id) q += ` AND a.classroom_id=:cid`;
    const tous = await sequelize.query(q, { replacements: { code: req.params.tenantCode, date: d, cid: classroom_id || null }, type: sequelize.QueryTypes.SELECT });
    const ids = await elevesAutorises('school', req);
    const rows = ids ? tous.filter(a => ids.includes(a.student_id)) : tous;
    res.json({ success: true, attendance: rows, records: rows, date: d });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/attendance', authenticate, verifyAcces, exigerDroit('presences'), async (req, res) => {
  try {
    const { records, classroom_id } = req.body;
    const ids = await elevesAutorises('school', req); // enseignant : seulement ses élèves
    const code = req.params.tenantCode;
    // Le jour choisi à l'écran (rattraper l'appel d'hier), jamais dans le futur
    const aujourdhui = new Date().toISOString().split('T')[0];
    const date = /^\d{4}-\d{2}-\d{2}$/.test(req.body.date || '') && req.body.date <= aujourdhui ? req.body.date : aujourdhui;
    for (const r of records || []) {
      if (!r?.student_id || (ids && !ids.includes(Number(r.student_id)))) continue;
      const statut = ['present', 'absent', 'retard'].includes(r.statut) ? r.statut : (r.est_present === false ? 'absent' : 'present');
      // Un seul relevé par élève et par jour : on remplace celui du jour s'il existe
      await sequelize.query(`DELETE FROM school_attendance WHERE tenant_code=:code AND student_id=:sid AND date_presence=:date`, { replacements: { code, sid: r.student_id, date } });
      await sequelize.query(
        `INSERT INTO school_attendance (tenant_code,student_id,classroom_id,date_presence,est_present,motif_absence,statut) VALUES(:code,:sid,:cid,:date,:present,:motif,:statut)`,
        { replacements: { code, sid: r.student_id, cid: classroom_id || null, date, present: statut !== 'absent', motif: r.motif_absence || null, statut } }
      );
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Historique d'une classe : les élèves de son niveau (ou affectés à la classe)
router.get('/:tenantCode/attendance/summary', authenticate, verifyAcces, async (req, res) => {
  try {
    const { classroom_id } = req.query;
    if (!classroom_id) return res.status(400).json({ success: false, message: 'classroom_id requis.' });
    if (!peutVoirClasse(req, classroom_id)) return res.status(403).json({ success: false, message: "Cette classe ne vous est pas attribuée." });
    const rows = await sequelize.query(
      `SELECT s.id as student_id, s.nom, s.prenom,
              COUNT(a.id) FILTER (WHERE COALESCE(a.statut, CASE WHEN a.est_present THEN 'present' ELSE 'absent' END) <> 'absent')::int as presences,
              COUNT(a.id) FILTER (WHERE COALESCE(a.statut, CASE WHEN a.est_present THEN 'present' ELSE 'absent' END) = 'absent')::int as absences,
              COUNT(a.id) FILTER (WHERE a.statut = 'retard')::int as retards,
              COUNT(a.id)::int as total
       FROM school_students s
       JOIN school_classrooms c ON c.id=:cid AND c.tenant_code=s.tenant_code
       LEFT JOIN school_attendance a ON a.student_id=s.id
       WHERE s.tenant_code=:code AND s.statut='actif' AND (s.classroom_id=c.id OR (s.classroom_id IS NULL AND s.niveau=c.niveau))
       GROUP BY s.id, s.nom, s.prenom ORDER BY s.nom`,
      { replacements: { code: req.params.tenantCode, cid: classroom_id }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, summary: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── NOTES ───────────────────────────────────────────────────────────────────

router.get('/:tenantCode/grades', authenticate, verifyAcces, async (req, res) => {
  try {
    const { student_id, classroom_id, periode } = req.query;
    const ids = await elevesAutorises('school', req);
    let q = `SELECT g.*,s.nom as student_nom,s.prenom as student_prenom FROM school_grades g LEFT JOIN school_students s ON g.student_id=s.id WHERE g.tenant_code=:code`;
    if (ids) q += ids.length ? ` AND g.student_id IN (:ids)` : ` AND false`;
    if (student_id) q += ` AND g.student_id=:sid`;
    if (classroom_id) q += ` AND g.classroom_id=:cid`;
    if (periode) q += ` AND g.periode=:periode`;
    const rows = await sequelize.query(q, { replacements: { code: req.params.tenantCode, sid: student_id, cid: classroom_id, periode, ids: ids?.length ? ids : [0] }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, grades: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/grades', authenticate, verifyAcces, exigerDroit('notes'), async (req, res) => {
  try {
    const { student_id, classroom_id, matiere, note, note_max, coefficient, periode, commentaire } = req.body;
    if (!student_id || note === undefined || note === null || note === '') return res.status(400).json({ success: false, message: 'Élève et note obligatoires.' });
    if (!(await peutVoirEleve('school', req, student_id))) return res.status(403).json({ success: false, message: "Cet élève n'est pas dans vos classes." });
    const [rows] = await sequelize.query(
      `INSERT INTO school_grades (tenant_code,student_id,classroom_id,matiere,note,note_max,coefficient,periode,commentaire) VALUES(:code,:sid,:cid,:mat,:note,:nmax,:coeff,:periode,:comm) RETURNING *`,
      { replacements: { code: req.params.tenantCode, sid: student_id, cid: classroom_id || null, mat: matiere, note, nmax: note_max || 20, coeff: coefficient || 1, periode, comm: commentaire }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true, grade: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:tenantCode/grades/:id', authenticate, verifyAcces, exigerDroit('notes'), async (req, res) => {
  try {
    const [noteExistante] = await sequelize.query(`SELECT student_id FROM school_grades WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    if (!noteExistante) return res.status(404).json({ success: false, message: 'Note introuvable.' });
    if (!(await peutVoirEleve('school', req, noteExistante.student_id))) return res.status(403).json({ success: false, message: "Cet élève n'est pas dans vos classes." });
    const { matiere, note, note_max, coefficient, periode, commentaire } = req.body;
    await sequelize.query(
      `UPDATE school_grades SET matiere=:mat,note=:note,note_max=:nmax,coefficient=:coeff,periode=:periode,commentaire=:comm WHERE id=:id AND tenant_code=:code`,
      { replacements: { mat: matiere, note, nmax: note_max || 20, coeff: coefficient || 1, periode, comm: commentaire, id: req.params.id, code: req.params.tenantCode } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/grades/:id', authenticate, verifyAcces, exigerDroit('notes'), async (req, res) => {
  try {
    const [noteExistante] = await sequelize.query(`SELECT student_id FROM school_grades WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    if (!noteExistante) return res.status(404).json({ success: false, message: 'Note introuvable.' });
    if (!(await peutVoirEleve('school', req, noteExistante.student_id))) return res.status(403).json({ success: false, message: "Cet élève n'est pas dans vos classes." });
    await sequelize.query(`DELETE FROM school_grades WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── FRAIS SCOLAIRES ─────────────────────────────────────────────────────────

router.get('/:tenantCode/fees', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT f.*,s.nom as student_nom,s.prenom as student_prenom,s.numero_matricule FROM school_fees f LEFT JOIN school_students s ON f.student_id=s.id WHERE f.tenant_code=:code ORDER BY f.created_at DESC`,
      { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, fees: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/fees', authenticate, verifyTenant, async (req, res) => {
  try {
    const { student_id, montant, type_frais, periode, echeance } = req.body;
    if (!student_id || !montant) return res.status(400).json({ success: false, message: 'Élève et montant obligatoires.' });
    const [rows] = await sequelize.query(
      `INSERT INTO school_fees (tenant_code,student_id,montant,type_frais,periode,echeance) VALUES(:code,:sid,:montant,:type,:periode,:ech) RETURNING *`,
      { replacements: { code: req.params.tenantCode, sid: student_id, montant, type: type_frais || null, periode: periode || null, ech: echeance || null }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true, fee: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:tenantCode/fees/:id/pay', authenticate, verifyTenant, async (req, res) => {
  try {
    const { montant_paye } = req.body;
    await sequelize.query(
      `UPDATE school_fees SET montant_paye=COALESCE(CAST(:mp AS DECIMAL),montant),est_paye=(COALESCE(CAST(:mp AS DECIMAL),montant)>=montant),date_paiement=CURRENT_DATE WHERE id=:id AND tenant_code=:code`,
      // « Encaisser » sans montant = le frais est payé en entier
      { replacements: { mp: montant_paye ?? null, id: req.params.id, code: req.params.tenantCode } }
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
      return enforceGestionAccess(req, res, next);
    }
    const [member] = await sequelize.query(
      `SELECT * FROM school_members WHERE tenant_code=:code AND numero_h=:n AND is_active=true LIMIT 1`,
      { replacements: { code: tenantCode, n: req.userId }, type: sequelize.QueryTypes.SELECT }
    );
    if (!member) return res.status(403).json({ success: false, message: 'Vous n\'êtes pas membre de cet établissement.' });
    req.member = member;
    return enforceGestionAccess(req, res, next);
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}

// ─── MEMBRES (par numéroH) ────────────────────────────────────────────────────

router.get('/:tenantCode/members', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT m.*,u.prenom,u.nom_famille AS nom,u.photo,u.tel1 AS telephone FROM school_members m LEFT JOIN users u ON m.numero_h=u.numero_h WHERE m.tenant_code=:code AND m.is_active=true ORDER BY m.role,m.created_at`,
      { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, members: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/members/add', authenticate, verifyTenant, async (req, res) => {
  try {
    const { role, linked_student_id } = req.body;
    const identifiant = req.body.telephone || req.body.identifiant || req.body.numero_h;
    const code = req.params.tenantCode;
    const user = await trouverUtilisateur(identifiant);
    if (!user) return res.status(404).json({ success: false, message: MESSAGE_INTROUVABLE(identifiant || '') });
    const numero_h = user.numeroH;
    const nom_display = `${user.prenom} ${user.nom}`;
    const [rows] = await sequelize.query(
      `INSERT INTO school_members (tenant_code,numero_h,role,linked_student_id,nom_display,added_by)
       VALUES(:code,:n,:role,:sid,:nom,:by)
       ON CONFLICT(tenant_code,numero_h,(COALESCE(linked_student_id,0))) DO UPDATE SET role=EXCLUDED.role,nom_display=EXCLUDED.nom_display,is_active=true
       RETURNING *`,
      { replacements: { code, n: numero_h, role: role || 'parent', sid: linked_student_id || null, nom: nom_display, by: req.userId }, type: sequelize.QueryTypes.INSERT }
    );
    await notifier(numero_h, 'school_member', `Vous avez été ajouté(e) à l'établissement "${req.tenant.name}" (rôle : ${role || 'parent'}).`);
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
      // Tous les enfants reliés à ce parent ; ?eleve=ID choisit celui à afficher
      const children = await sequelize.query(
        `SELECT s.id, s.prenom, s.nom, s.niveau FROM school_members m JOIN school_students s ON s.id = m.linked_student_id
         WHERE m.tenant_code=:code AND m.numero_h=:n AND m.is_active=true AND s.statut='actif' ORDER BY s.prenom`,
        { replacements: { code, n: req.userId }, type: sequelize.QueryTypes.SELECT }
      );
      data.children = children;
      const choisi = children.find(c => String(c.id) === String(req.query.eleve || ''));
      const studentId = choisi?.id || children[0]?.id || member.linked_student_id;
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
        data = { ...data, student: student || null, grades, attendance, fees, bulletins };
      }
    }

    res.json({ success: true, role: member.role, member, tenant: { name: tenant.name, logo_url: tenant.logo_url, address: tenant.address, phone: tenant.phone }, ...data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── BULLETINS ────────────────────────────────────────────────────────────────

router.get('/:tenantCode/bulletins', authenticate, verifyTenant, async (req, res) => {
  try {
    const { periode, student_id } = req.query;
    let q = `SELECT b.*,s.nom as student_nom,s.prenom as student_prenom,s.numero_matricule,s.niveau,c.nom as classe FROM school_bulletins b LEFT JOIN school_students s ON b.student_id=s.id LEFT JOIN school_classrooms c ON s.classroom_id=c.id WHERE b.tenant_code=:code`;
    if (periode)    q += ` AND b.periode=:periode`;
    if (student_id) q += ` AND b.student_id=:sid`;
    q += ` ORDER BY s.nom`;
    const rows = await sequelize.query(q, { replacements: { code: req.params.tenantCode, periode, sid: student_id }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, bulletins: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/bulletins/generate', authenticate, verifyTenant, async (req, res) => {
  try {
    const { periode, publish = false } = req.body;
    const annee_scolaire = req.body.annee_scolaire || req.body.annee || ''; // l'écran envoie « annee »
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
          await notifier(m.numero_h, 'bulletin', `📊 Bulletin du ${periode} disponible — ${student.prenom} ${student.nom} : ${moy ? moy + '/20' : '—'} (${calcMention(moy)})`);
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
        await notifier(m.numero_h, 'bulletin', `📊 Nouveau bulletin disponible — ${bulletin.periode} : ${bulletin.moyenne_generale ? bulletin.moyenne_generale + '/20' : '—'} (${bulletin.mention})`);
      }
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── DEMANDES DE PRÉ-INSCRIPTION (vitrine publique) ────────────────────────

export async function ensureEnrollRequestsTable() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS school_enroll_requests (
      id SERIAL PRIMARY KEY,
      tenant_code VARCHAR(50) NOT NULL,
      nom_enfant VARCHAR(150) NOT NULL,
      date_naissance DATE,
      niveau_souhaite VARCHAR(50),
      nom_parent VARCHAR(150),
      telephone_parent VARCHAR(50) NOT NULL,
      statut VARCHAR(20) DEFAULT 'nouvelle',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

router.get('/:tenantCode/enroll-requests', authenticate, verifyTenant, async (req, res) => {
  try {
    await ensureEnrollRequestsTable();
    const rows = await sequelize.query(`SELECT * FROM school_enroll_requests WHERE tenant_code=:code ORDER BY created_at DESC`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, requests: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:tenantCode/enroll-requests/:id/convert', authenticate, verifyTenant, async (req, res) => {
  try {
    const code = req.params.tenantCode;
    const [reqRow] = await sequelize.query(`SELECT * FROM school_enroll_requests WHERE id=:id AND tenant_code=:code LIMIT 1`, { replacements: { id: req.params.id, code }, type: sequelize.QueryTypes.SELECT });
    if (!reqRow) return res.status(404).json({ success: false, message: 'Demande introuvable.' });
    const [cnt] = await sequelize.query(`SELECT COUNT(*) as c FROM school_students WHERE tenant_code=:code`, { replacements: { code }, type: sequelize.QueryTypes.SELECT });
    const mat = `ELV-${code.slice(-4)}-${new Date().getFullYear()}-${String(+cnt.c + 1).padStart(4, '0')}`;
    const nameParts = (reqRow.nom_enfant || '').trim().split(/\s+/);
    const prenom = nameParts.shift() || reqRow.nom_enfant;
    const nom = nameParts.join(' ') || '—';
    const [rows] = await sequelize.query(
      `INSERT INTO school_students (tenant_code,nom,prenom,date_naissance,telephone_parent,nom_parent,numero_matricule,niveau) VALUES(:code,:nom,:prenom,:dob,:tel,:parent,:mat,:niveau) RETURNING *`,
      { replacements: { code, nom, prenom, dob: reqRow.date_naissance || null, tel: reqRow.telephone_parent, parent: reqRow.nom_parent || null, mat, niveau: reqRow.niveau_souhaite || null }, type: sequelize.QueryTypes.INSERT }
    );
    await sequelize.query(`UPDATE school_enroll_requests SET statut='converti' WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code } });
    res.json({ success: true, student: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:tenantCode/enroll-requests/:id/reject', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`UPDATE school_enroll_requests SET statut='rejetee' WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── AVIS PARENTS / ÉLÈVES ──────────────────────────────────────────────────

export async function ensureSchoolReviewsTable() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS school_reviews (
      id SERIAL PRIMARY KEY,
      tenant_code VARCHAR(50) NOT NULL,
      nom_auteur VARCHAR(150),
      numero_h VARCHAR(50),
      note INTEGER NOT NULL,
      commentaire TEXT,
      statut VARCHAR(20) DEFAULT 'en_attente',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

router.get('/:tenantCode/reviews', authenticate, verifyTenant, async (req, res) => {
  try {
    await ensureSchoolReviewsTable();
    const rows = await sequelize.query(`SELECT * FROM school_reviews WHERE tenant_code=:code ORDER BY created_at DESC`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, reviews: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:tenantCode/reviews/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await ensureSchoolReviewsTable();
    const { statut } = req.body;
    await sequelize.query(`UPDATE school_reviews SET statut=:statut WHERE id=:id AND tenant_code=:code`, { replacements: { statut, id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/reviews/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`DELETE FROM school_reviews WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;
