/**
 * Routes gestion interne — Formation Religieuse (Daroul / Médersa / Institut islamique)
 * Préfixe : /api/madrasa-mgmt/:tenantCode
 *
 * Niveaux : Iqra → Qa'idah → Débutant → Juz' → Hizb → Hafiz
 * Matières : Coran, Tajwid, Hadith, Fiqh, Arabe, Histoire islamique, Morale
 */

import express from 'express';
import { trouverPersonne } from '../utils/trouverPersonne.js';
import { syncAccountFromTenant } from '../utils/tenantSync.js';
import { sequelize } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { enforceGestionAccess } from '../middleware/gestionAccessGuard.js';
import { ensureTenantExtraColumns } from './clinic-management.js';
import { attraperErreursAsync } from '../utils/routerAsync.js';
import { ajouterRouteRapport } from '../utils/routeRapport.js';
import { avecAccesEmployes, ajouterRoutesAccesEmployes } from '../utils/accesEmployes.js';
import { ajouterRoutesCoursEtBibliotheque, numeroHComplet, TABLES_MADRASA } from './schoolCoursBibliotheque.js';

const router = attraperErreursAsync(express.Router());

// Employés autorisés par le propriétaire (voir utils/accesEmployes.js)
const verifyTenant = avecAccesEmployes(verifyTenantProprietaire);
const verifyMember = avecAccesEmployes(verifyMemberProprietaire);

// Année scolaire en cours (elle commence en septembre) : « 2026-2027 », etc.
function anneeScolaireCourante() {
  const d = new Date();
  const debut = d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1;
  return `${debut}-${debut + 1}`;
}

// Plusieurs routes n'ont pas de try/catch : avec Express 4, une erreur de base
// y devient un rejet non géré qui arrête tout le serveur. On renvoie une erreur
// propre à la place.
for (const methode of ['get', 'post', 'put', 'delete']) {
  const originale = router[methode].bind(router);
  router[methode] = (chemin, ...handlers) => originale(chemin, ...handlers.map(h =>
    (req, res, next) => Promise.resolve(h(req, res, next)).catch(err => {
      if (res.headersSent) return next(err);
      res.status(500).json({ success: false, message: err.message });
    })
  ));
}

// ─── Liens parent ↔ étudiants ─────────────────────────────────────────────────
// Un parent peut suivre plusieurs enfants du même institut : chaque lien est
// une ligne de madrasa_member_students. L'ancienne colonne
// madrasa_members.linked_student_id reste remplie (dernier enfant relié) et
// ses valeurs existantes sont recopiées une fois dans la table de liens.
let liensMadrasaPrets = false;
export async function ensureLiensParentsMadrasa() {
  if (liensMadrasaPrets) return;
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS madrasa_member_students (
      id          SERIAL PRIMARY KEY,
      tenant_code VARCHAR(50) NOT NULL,
      numero_h    VARCHAR(30) NOT NULL,
      student_id  INTEGER NOT NULL REFERENCES madrasa_students(id) ON DELETE CASCADE,
      created_at  TIMESTAMP DEFAULT NOW(),
      UNIQUE(tenant_code, numero_h, student_id)
    );
    INSERT INTO madrasa_member_students (tenant_code, numero_h, student_id)
      SELECT m.tenant_code, m.numero_h, m.linked_student_id
      FROM madrasa_members m
      JOIN madrasa_students s ON s.id = m.linked_student_id AND s.tenant_code = m.tenant_code
      WHERE m.linked_student_id IS NOT NULL AND m.is_active = true
    ON CONFLICT (tenant_code, numero_h, student_id) DO NOTHING;
  `);
  liensMadrasaPrets = true;
}

// Étudiants de l'institut suivis par ce membre actif : enfants reliés par la
// direction, ou fiche étudiant portant son NuméroH (étudiant / parent).
export async function elevesLiesMadrasa(tc, numeroH) {
  if (!tc || !numeroH) return [];
  await ensureLiensParentsMadrasa();
  return sequelize.query(
    `SELECT s.id, s.prenom, s.nom, s.niveau
     FROM madrasa_students s
     WHERE s.tenant_code = :tc
       AND EXISTS (SELECT 1 FROM madrasa_members m WHERE m.tenant_code = :tc AND m.numero_h = :nh AND m.is_active = true)
       AND (s.id IN (SELECT l.student_id FROM madrasa_member_students l WHERE l.tenant_code = :tc AND l.numero_h = :nh)
            OR s.numero_h = :nh OR s.parent_numero_h = :nh)
     ORDER BY s.prenom, s.nom`,
    { replacements: { tc, nh: numeroH }, type: sequelize.QueryTypes.SELECT }
  );
}

// Membres actifs reliés à un étudiant (pour les notifications de bulletin)
async function membresLiesAEtudiant(tc, studentId, studentNumeroH) {
  await ensureLiensParentsMadrasa();
  return sequelize.query(
    `SELECT DISTINCT m.numero_h FROM madrasa_members m
     WHERE m.tenant_code = :tc AND m.is_active = true
       AND (m.numero_h IN (SELECT l.numero_h FROM madrasa_member_students l WHERE l.tenant_code = :tc AND l.student_id = :sid)
            OR m.numero_h = :snh)`,
    { replacements: { tc, sid: studentId, snh: studentNumeroH || '' }, type: sequelize.QueryTypes.SELECT }
  );
}

// ─── Middleware : vérifier que l'utilisateur est directeur / propriétaire ──────
async function verifyTenantProprietaire(req, res, next) {
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
    return enforceGestionAccess(req, res, next);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// ─── Middleware : directeur OU membre actif ────────────────────────────────────
async function verifyMemberProprietaire(req, res, next) {
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
      req.tenant = tenant; req.memberRole = 'directeur'; return enforceGestionAccess(req, res, next);
    }
    const [members] = await sequelize.query(
      `SELECT * FROM madrasa_members WHERE tenant_code = :tc AND numero_h = :uid AND is_active = true`,
      { replacements: { tc: tenantCode, uid: userId } }
    );
    if (!members.length) return res.status(403).json({ message: 'Vous n\'êtes pas membre de cet institut.' });
    req.tenant = tenant; req.memberRole = members[0].role; return enforceGestionAccess(req, res, next);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// ── Infos générales ────────────────────────────────────────────────────────────
router.get('/:tenantCode/info', authenticate, verifyTenant, async (req, res) => {
  res.json({ success: true, tenant: req.tenant });
});

// ── Paramètres : nom, logo, contact ────────────────────────────────────────────
router.put('/:tenantCode/settings', authenticate, verifyTenant, async (req, res) => {
  try {
    await ensureTenantExtraColumns();
    const { name, logo_url, address, phone, email, description, horaires, phone_urgence } = req.body;
    const code = req.params.tenantCode;
    await sequelize.query(
      `UPDATE management_tenants SET
        name          = COALESCE(:name, name),
        logo_url      = COALESCE(NULLIF(:logo, ''), logo_url),
        address       = :address,
        phone         = :phone,
        email         = :email,
        description   = :desc,
        horaires      = :horaires,
        phone_urgence = :phone_urgence
       WHERE tenant_code = :code`,
      { replacements: { name: name || null, hasLogo: logo_url !== undefined, logo: logo_url || null, address: address || null, phone: phone || null, email: email || null, desc: description || null, horaires: horaires || null, phone_urgence: phone_urgence || null, code } }
    );
    const [rows] = await sequelize.query(`SELECT * FROM management_tenants WHERE tenant_code = :code LIMIT 1`, { replacements: { code } });
    await syncAccountFromTenant(req.params.tenantCode);
    res.json({ success: true, tenant: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Profil du directeur (chef) ─────────────────────────────────────────────────
router.get('/:tenantCode/director-profile', authenticate, verifyMember, async (req, res) => {
  const tc = req.params.tenantCode;
  try {
    const [rows] = await sequelize.query(
      `SELECT u.numero_h, u.prenom,
              COALESCE(u.nom_famille, '') AS nom_famille,
              u.photo
       FROM management_tenants mt
       JOIN users u ON u.numero_h = mt.owner_numero_h
       WHERE mt.tenant_code = :tc AND mt.is_active = true
       LIMIT 1`,
      { replacements: { tc } }
    );
    if (!rows.length) return res.status(404).json({ message: 'Directeur introuvable.' });
    const d = rows[0];
    res.json({ success: true,
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
    res.json({ success: true, totalStudents: +(r1.total_etudiants||0), totalStaff: +(r2.total_enseignants||0),
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
  res.json({ success: true, students });
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
    res.json({ success: true, student: rows[0] });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:tenantCode/students/:id', authenticate, verifyTenant, async (req, res) => {
  const { tenantCode: tc, id } = req.params;
  const { prenom, nom, date_naissance, sexe, telephone_parent, niveau, numero_h, parent_numero_h } = req.body;
  // Modifier la fiche entière (avant : seul le niveau était gardé)
  await sequelize.query(
    `UPDATE madrasa_students SET
       prenom = COALESCE(:prenom, prenom), nom = COALESCE(:nom, nom),
       date_naissance = :dn, sexe = COALESCE(:sexe, sexe), telephone_parent = :tel,
       niveau = COALESCE(:niveau, niveau), numero_h = :nh, parent_numero_h = :pnh, updated_at = NOW()
     WHERE id = :id AND tenant_code = :tc`,
    { replacements: { prenom: prenom || null, nom: nom || null, dn: date_naissance ? String(date_naissance).slice(0, 10) : null, sexe: sexe || null,
      tel: telephone_parent || '', niveau: niveau || null, nh: numero_h || null, pnh: parent_numero_h || null, id, tc } }
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
  res.json({ success: true, staff });
});

router.post('/:tenantCode/staff', authenticate, verifyTenant, async (req, res) => {
  const tc = req.params.tenantCode;
  const { prenom, nom, role, specialite, telephone, numero_h } = req.body;
  if (!prenom || !nom) return res.status(400).json({ message: 'Prénom et nom requis.' });
  const nh = await numeroHComplet(numero_h);
  const [rows] = await sequelize.query(
    `INSERT INTO madrasa_staff (tenant_code, prenom, nom, role, specialite, telephone, numero_h)
     VALUES (:tc, :prenom, :nom, :role, :spec, :tel, :nh) RETURNING *`,
    { replacements: { tc, prenom, nom, role: role || 'Enseignant', spec: specialite || 'Coran', tel: telephone || '', nh } }
  );
  if (nh) {
    // L'enseignant est prévenu : il pourra marquer le début et la fin de ses cours
    await sequelize.query(
      `INSERT INTO notifications (user_id, type, message) VALUES(:uid,'school_member',:msg) ON CONFLICT DO NOTHING`,
      { replacements: { uid: nh, msg: `Vous êtes enregistré(e) au personnel de « ${req.tenant?.name || 'votre madrasa'} ». Marquez le début et la fin de vos cours : moftal.com/madrasa/${tc}/enseignant` } }
    ).catch(() => {});
  }
  res.json({ success: true, staff: rows[0] });
});

router.put('/:tenantCode/staff/:id', authenticate, verifyTenant, async (req, res) => {
  const { prenom, nom, role, specialite, telephone, numero_h } = req.body;
  if (!prenom || !nom) return res.status(400).json({ success: false, message: 'Prénom et nom requis.' });
  const nh = await numeroHComplet(numero_h);
  await sequelize.query(
    `UPDATE madrasa_staff SET prenom = :prenom, nom = :nom, role = COALESCE(:role, role), specialite = COALESCE(:spec, specialite),
       telephone = :tel, numero_h = :nh
     WHERE id = :id AND tenant_code = :tc`,
    { replacements: { prenom, nom, role: role || null, spec: specialite || null, tel: telephone || '', nh, id: req.params.id, tc: req.params.tenantCode } }
  );
  res.json({ success: true });
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
  res.json({ success: true, halaqas });
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
  res.json({ success: true, halaqa: rows[0] });
});

router.put('/:tenantCode/halaqas/:id', authenticate, verifyTenant, async (req, res) => {
  const { nom, niveau, capacite, enseignant_id } = req.body;
  if (!nom) return res.status(400).json({ success: false, message: 'Nom requis.' });
  await sequelize.query(
    `UPDATE madrasa_halaqas SET nom = :nom, niveau = COALESCE(:niveau, niveau), capacite = :cap, enseignant_id = :eid
     WHERE id = :id AND tenant_code = :tc`,
    { replacements: { nom, niveau: niveau || null, cap: capacite || 20, eid: enseignant_id || null, id: req.params.id, tc: req.params.tenantCode } }
  );
  res.json({ success: true });
});

// Emploi du temps hebdomadaire d'une halaqa — [{jour, heure_debut, heure_fin, matiere, enseignant_id}]
router.put('/:tenantCode/halaqas/:id/schedule', authenticate, verifyTenant, async (req, res) => {
  await sequelize.query(`ALTER TABLE madrasa_halaqas ADD COLUMN IF NOT EXISTS emploi_du_temps JSONB DEFAULT '[]';`);
  await sequelize.query(
    `UPDATE madrasa_halaqas SET emploi_du_temps = :edt::jsonb WHERE id = :id AND tenant_code = :tc`,
    { replacements: { edt: JSON.stringify(req.body?.emploi_du_temps || []), id: req.params.id, tc: req.params.tenantCode } }
  );
  res.json({ success: true });
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
  res.json({ success: true, attendance });
});

router.post('/:tenantCode/attendance', authenticate, verifyTenant, async (req, res) => {
  const tc = req.params.tenantCode;
  const { records } = req.body; // [{ student_id, statut }]
  if (!Array.isArray(records) || records.length === 0) return res.status(400).json({ success: false, message: 'Aucune présence à enregistrer.' });
  // Date choisie dans la page (appel d'un autre jour), sinon aujourd'hui
  const date = /^\d{4}-\d{2}-\d{2}$/.test(req.body.date || '') ? req.body.date : new Date().toISOString().slice(0, 10);
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
  res.json({ success: true, grades });
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
  res.json({ success: true, grade: rows[0] });
});

router.put('/:tenantCode/grades/:id', authenticate, verifyTenant, async (req, res) => {
  const { matiere, note, note_max, periode, sourate, commentaire } = req.body;
  if (note === undefined || note === null || note === '' || Number.isNaN(+note)) return res.status(400).json({ success: false, message: 'Note requise.' });
  await sequelize.query(
    `UPDATE madrasa_grades SET matiere = COALESCE(:mat, matiere), note = :note, note_max = :nm, periode = COALESCE(:per, periode),
       sourate = :srt, commentaire = :com
     WHERE id = :id AND tenant_code = :tc`,
    { replacements: { mat: matiere || null, note: parseFloat(note), nm: parseFloat(note_max) || 20, per: periode || null, srt: sourate || '', com: commentaire || '', id: req.params.id, tc: req.params.tenantCode } }
  );
  res.json({ success: true });
});

router.delete('/:tenantCode/grades/:id', authenticate, verifyTenant, async (req, res) => {
  await sequelize.query(
    `DELETE FROM madrasa_grades WHERE id = :id AND tenant_code = :tc`,
    { replacements: { id: req.params.id, tc: req.params.tenantCode } }
  );
  res.json({ success: true });
});

// ── Frais ─────────────────────────────────────────────────────────────────────
router.get('/:tenantCode/fees', authenticate, verifyMember, async (req, res) => {
  const tc = req.params.tenantCode;
  const [fees] = await sequelize.query(
    `SELECT f.*, s.prenom AS student_prenom, s.nom AS student_nom, s.telephone_parent
     FROM madrasa_fees f
     JOIN madrasa_students s ON s.id = f.student_id
     WHERE f.tenant_code = :tc ORDER BY f.created_at DESC`,
    { replacements: { tc } }
  );
  res.json({ success: true, fees });
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
  res.json({ success: true, fee: rows[0] });
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
  await ensureLiensParentsMadrasa();
  const [members] = await sequelize.query(
    `SELECT m.*, COALESCE(u.prenom || ' ' || u.nom_famille, m.nom_display) AS nom_display, u.tel1 AS telephone_compte,
       COALESCE((SELECT json_agg(json_build_object('id', s.id, 'prenom', s.prenom, 'nom', s.nom) ORDER BY s.prenom)
                 FROM madrasa_member_students l JOIN madrasa_students s ON s.id = l.student_id AND s.tenant_code = l.tenant_code
                 WHERE l.tenant_code = m.tenant_code AND l.numero_h = m.numero_h), '[]'::json) AS enfants
     FROM madrasa_members m
     LEFT JOIN users u ON u.numero_h = m.numero_h
     WHERE m.tenant_code = :tc AND m.is_active = true ORDER BY m.role, m.created_at`,
    { replacements: { tc: req.params.tenantCode } }
  );
  res.json({ success: true, members });
});

router.post('/:tenantCode/members/add', authenticate, verifyTenant, async (req, res) => {
  const tc = req.params.tenantCode;
  const { role, linked_student_id } = req.body;
  // NuméroH ou numéro de téléphone du compte
  let trouve;
  try { trouve = await trouverPersonne(req.body.numero_h || req.body.telephone); }
  catch (err) { return res.status(500).json({ success: false, message: err.message }); }
  if (!trouve.personne) return res.status(trouve.statut).json({ success: false, message: trouve.erreur });
  const user = { prenom: trouve.personne.prenom, nom_famille: trouve.personne.nom };
  const numero_h = trouve.personne.numero_h;
  // L'étudiant relié doit appartenir à CET institut
  let lsid = null;
  if (linked_student_id !== undefined && linked_student_id !== null && linked_student_id !== '') {
    const [eleves] = await sequelize.query(
      `SELECT id FROM madrasa_students WHERE id = :sid AND tenant_code = :tc LIMIT 1`,
      { replacements: { sid: parseInt(linked_student_id, 10) || 0, tc } }
    );
    if (!eleves.length) return res.status(404).json({ success: false, message: 'Étudiant introuvable dans cet institut.' });
    lsid = eleves[0].id;
  }
  const roleFinal = role || 'apprenant';
  const nom = [user.prenom, user.nom_famille].filter(Boolean).join(' ');
  try {
    await ensureLiensParentsMadrasa();
    const [rows] = await sequelize.query(
      `INSERT INTO madrasa_members (tenant_code, numero_h, role, linked_student_id, nom_display, is_active)
       VALUES (:tc, :nh, :role, :lsid, :nom, true)
       ON CONFLICT (tenant_code, numero_h) DO UPDATE SET role = EXCLUDED.role,
         linked_student_id = COALESCE(EXCLUDED.linked_student_id, madrasa_members.linked_student_id),
         nom_display = EXCLUDED.nom_display, is_active = true
       RETURNING *`,
      { replacements: { tc, nh: numero_h, role: roleFinal, lsid, nom } }
    );
    // Un enfant de plus : les liens déjà enregistrés sont conservés
    if (lsid) {
      await sequelize.query(
        `INSERT INTO madrasa_member_students (tenant_code, numero_h, student_id) VALUES (:tc, :nh, :sid)
         ON CONFLICT (tenant_code, numero_h, student_id) DO NOTHING`,
        { replacements: { tc, nh: numero_h, sid: lsid } }
      );
    }
    res.json({ success: true, member: rows[0], user: { prenom: user.prenom, nom: user.nom_famille }, message: `${user.prenom} ajouté comme ${roleFinal}.` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Retirer un seul enfant du suivi d'un parent
router.delete('/:tenantCode/members/:id/students/:studentId', authenticate, verifyTenant, async (req, res) => {
  const tc = req.params.tenantCode;
  await ensureLiensParentsMadrasa();
  const [members] = await sequelize.query(
    `SELECT numero_h FROM madrasa_members WHERE id = :id AND tenant_code = :tc LIMIT 1`,
    { replacements: { id: req.params.id, tc } }
  );
  if (!members.length) return res.status(404).json({ success: false, message: 'Membre introuvable.' });
  await sequelize.query(
    `DELETE FROM madrasa_member_students WHERE tenant_code = :tc AND numero_h = :nh AND student_id = :sid`,
    { replacements: { tc, nh: members[0].numero_h, sid: req.params.studentId } }
  );
  await sequelize.query(
    `UPDATE madrasa_members SET linked_student_id = NULL WHERE id = :id AND tenant_code = :tc AND linked_student_id = :sid`,
    { replacements: { id: req.params.id, tc, sid: req.params.studentId } }
  );
  res.json({ success: true });
});

router.delete('/:tenantCode/members/:id', authenticate, verifyTenant, async (req, res) => {
  const tc = req.params.tenantCode;
  await ensureLiensParentsMadrasa();
  const [rows] = await sequelize.query(
    `UPDATE madrasa_members SET is_active = false, linked_student_id = NULL WHERE id = :id AND tenant_code = :tc RETURNING numero_h`,
    { replacements: { id: req.params.id, tc } }
  );
  if (rows.length) {
    await sequelize.query(
      `DELETE FROM madrasa_member_students WHERE tenant_code = :tc AND numero_h = :nh`,
      { replacements: { tc, nh: rows[0].numero_h } }
    );
  }
  res.json({ success: true });
});

// ── Mon accès (étudiant / parent / enseignant) ─────────────────────────────────
// Même forme de réponse que l'école (EspaceParentEcole sert aux deux).
// ?student_id= choisit l'enfant affiché quand le parent en suit plusieurs.
router.get('/:tenantCode/my-access', authenticate, verifyMember, async (req, res) => {
  const tc = req.params.tenantCode;
  const userId = req.userId;
  const role = req.memberRole;
  const t = req.tenant || {};
  const tenant = { name: t.name, logo_url: t.logo_url, address: t.address, phone: t.phone };

  if (role === 'directeur' || role === 'enseignant') {
    return res.json({ success: true, role, tenant, message: 'Accès directeur/enseignant — utilisez le tableau de bord complet.' });
  }

  const [members] = await sequelize.query(
    `SELECT * FROM madrasa_members WHERE tenant_code = :tc AND numero_h = :uid AND is_active = true`,
    { replacements: { tc, uid: userId } }
  );
  const member = members[0] || null;

  const children = await elevesLiesMadrasa(tc, userId);
  const demande = req.query.student_id ? parseInt(req.query.student_id, 10) : null;
  if (req.query.student_id && !children.some(c => c.id === demande)) {
    return res.status(403).json({ success: false, message: 'Cet étudiant n\'est pas relié à votre compte.' });
  }
  const studentId = demande || children[0]?.id || null;

  let student = null, grades = [], attendance = [], fees = [], bulletins = [];
  if (studentId) {
    const rep = { replacements: { tc, sid: studentId } };
    const [ss] = await sequelize.query(
      `SELECT * FROM madrasa_students WHERE id = :sid AND tenant_code = :tc LIMIT 1`, rep
    );
    student = ss[0] || null;
    [grades] = await sequelize.query(
      `SELECT * FROM madrasa_grades WHERE tenant_code = :tc AND student_id = :sid ORDER BY created_at DESC`, rep
    );
    [attendance] = await sequelize.query(
      `SELECT * FROM madrasa_attendance WHERE tenant_code = :tc AND student_id = :sid ORDER BY date_presence DESC LIMIT 30`, rep
    );
    [fees] = await sequelize.query(
      `SELECT * FROM madrasa_fees WHERE tenant_code = :tc AND student_id = :sid ORDER BY created_at DESC`, rep
    );
    [bulletins] = await sequelize.query(
      `SELECT * FROM madrasa_bulletins WHERE tenant_code = :tc AND student_id = :sid AND is_published = true ORDER BY created_at DESC`, rep
    );
  }

  res.json({ success: true, role, member, tenant, children, student, grades, attendance, fees, bulletins });
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
  res.json({ success: true, bulletins });
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
      { replacements: { tc, sid: s.id, per: periode, ann: annee || anneeScolaireCourante(), moy: moyenne, men: mention, pub: !!publish, pat: publish ? new Date() : null } }
    );

    if (publish) {
      // Notifier membres liés
      const linkedMembers = await membresLiesAEtudiant(tc, s.id, s.numero_h);
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
     WHERE b.id = :id AND b.tenant_code = :tc`, { replacements: { id: req.params.id, tc } }
  );
  if (rows.length) {
    const b = rows[0];
    const linked = await membresLiesAEtudiant(tc, b.student_id, b.student_nh);
    for (const m of linked) {
      await sequelize.query(
        `INSERT INTO notifications (user_id, type, message) VALUES (:uid, 'bulletin', :msg)`,
        { replacements: { uid: m.numero_h, msg: `📋 Bulletin de ${b.prenom} ${b.nom} (${b.periode}) publié — Moyenne : ${b.moyenne_generale}/20` } }
      ).catch(() => {});
    }
  }
  res.json({ success: true });
});


// ── Rapport du mois (recettes, dépenses, bénéfice) ──
ajouterRouteRapport(router, [authenticate, verifyTenant], {
  recettes: [{ label: 'Frais encaissés', table: 'madrasa_fees', montant: 'montant', date: 'date_paiement', where: 'est_paye' }],
});

// ── Accès des employés (géré par le propriétaire uniquement) ──
// ── Pointage des cours (enseignants) et bibliothèque de la madrasa ──
ajouterRoutesCoursEtBibliotheque(router, verifyTenant, TABLES_MADRASA);

ajouterRoutesAccesEmployes(router, [authenticate, verifyTenantProprietaire]);

export default router;
