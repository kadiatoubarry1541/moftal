import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { sequelize } from '../config/database.js';

const router = express.Router();

// Vérifie que le tenant appartient à l'utilisateur connecté (ou admin)
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
    if (!tenant) return res.status(403).json({ success: false, message: 'Accès refusé à cet espace clinique.' });
    req.tenant = tenant;
    next();
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// GET /api/clinic-mgmt/:tenantCode/info
router.get('/:tenantCode/info', authenticate, verifyTenant, async (req, res) => {
  res.json({ success: true, tenant: req.tenant });
});

// PUT /api/clinic-mgmt/:tenantCode/settings — mise à jour nom, logo, contact
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

// GET /api/clinic-mgmt/:tenantCode/dashboard
router.get('/:tenantCode/dashboard', authenticate, verifyTenant, async (req, res) => {
  try {
    const code = req.params.tenantCode;
    const [pCount]    = await sequelize.query(`SELECT COUNT(*) as c FROM clinic_patients WHERE tenant_code=:code`, { replacements: { code }, type: sequelize.QueryTypes.SELECT });
    const [sCount]    = await sequelize.query(`SELECT COUNT(*) as c FROM clinic_staff WHERE tenant_code=:code AND is_active=true`, { replacements: { code }, type: sequelize.QueryTypes.SELECT });
    const [aToday]    = await sequelize.query(`SELECT COUNT(*) as c FROM clinic_appointments_mgmt WHERE tenant_code=:code AND date_rdv=CURRENT_DATE`, { replacements: { code }, type: sequelize.QueryTypes.SELECT });
    const [aPending]  = await sequelize.query(`SELECT COUNT(*) as c FROM clinic_appointments_mgmt WHERE tenant_code=:code AND statut='pending'`, { replacements: { code }, type: sequelize.QueryTypes.SELECT });
    const [revenue]   = await sequelize.query(`SELECT COALESCE(SUM(montant),0) as t FROM clinic_payments_mgmt WHERE tenant_code=:code AND date_paiement>=DATE_TRUNC('month',CURRENT_DATE)`, { replacements: { code }, type: sequelize.QueryTypes.SELECT });
    const [rToday]    = await sequelize.query(`SELECT COALESCE(SUM(montant),0) as t FROM clinic_payments_mgmt WHERE tenant_code=:code AND DATE(date_paiement)=CURRENT_DATE`, { replacements: { code }, type: sequelize.QueryTypes.SELECT });
    const [pToday]    = await sequelize.query(`SELECT COUNT(*) as c FROM clinic_patients WHERE tenant_code=:code AND DATE(created_at)=CURRENT_DATE`, { replacements: { code }, type: sequelize.QueryTypes.SELECT });
    const [urgences]  = await sequelize.query(`SELECT COUNT(*) as c FROM clinic_appointments_mgmt WHERE tenant_code=:code AND service='Urgences' AND statut NOT IN ('done','cancelled')`, { replacements: { code }, type: sequelize.QueryTypes.SELECT });
    const recentPats  = await sequelize.query(`SELECT * FROM clinic_patients WHERE tenant_code=:code ORDER BY created_at DESC LIMIT 6`, { replacements: { code }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, stats: {
      patients: +pCount.c, staff: +sCount.c,
      appointmentsToday: +aToday.c, appointmentsPending: +aPending.c,
      revenueMonth: +revenue.t, revenueToday: +rToday.t,
      patientsToday: +pToday.c, urgences: +urgences.c
    }, recentPatients: recentPats });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── PATIENTS ───────────────────────────────────────────────────────────────

router.get('/:tenantCode/patients', authenticate, verifyTenant, async (req, res) => {
  try {
    const { search } = req.query;
    let q = `SELECT * FROM clinic_patients WHERE tenant_code=:code`;
    if (search) q += ` AND (nom ILIKE :s OR prenom ILIKE :s OR numero_matricule ILIKE :s OR telephone ILIKE :s)`;
    q += ` ORDER BY nom`;
    const patients = await sequelize.query(q, { replacements: { code: req.params.tenantCode, s: `%${search || ''}%` }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, patients });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/patients', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, prenom, date_naissance, sexe, telephone, adresse, groupe_sanguin, allergies } = req.body;
    const code = req.params.tenantCode;
    const [cnt] = await sequelize.query(`SELECT COUNT(*) as c FROM clinic_patients WHERE tenant_code=:code`, { replacements: { code }, type: sequelize.QueryTypes.SELECT });
    const mat = `PAT-${code.slice(-4)}-${String(+cnt.c + 1).padStart(4, '0')}`;
    const [rows] = await sequelize.query(
      `INSERT INTO clinic_patients (tenant_code,nom,prenom,date_naissance,sexe,telephone,adresse,groupe_sanguin,allergies,numero_matricule) VALUES(:code,:nom,:prenom,:dob,:sexe,:tel,:adr,:gs,:alg,:mat) RETURNING *`,
      { replacements: { code, nom, prenom, dob: date_naissance || null, sexe, tel: telephone, adr: adresse, gs: groupe_sanguin, alg: allergies, mat }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true, patient: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:tenantCode/patients/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, prenom, date_naissance, sexe, telephone, adresse, groupe_sanguin, allergies } = req.body;
    await sequelize.query(
      `UPDATE clinic_patients SET nom=:nom,prenom=:prenom,date_naissance=:dob,sexe=:sexe,telephone=:tel,adresse=:adr,groupe_sanguin=:gs,allergies=:alg WHERE id=:id AND tenant_code=:code`,
      { replacements: { nom, prenom, dob: date_naissance || null, sexe, tel: telephone, adr: adresse, gs: groupe_sanguin, alg: allergies, id: req.params.id, code: req.params.tenantCode } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/patients/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`DELETE FROM clinic_patients WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── PERSONNEL ──────────────────────────────────────────────────────────────

router.get('/:tenantCode/staff', authenticate, verifyTenant, async (req, res) => {
  try {
    const staff = await sequelize.query(`SELECT * FROM clinic_staff WHERE tenant_code=:code AND is_active=true ORDER BY nom`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, staff });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/staff', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, prenom, role, service, specialite, telephone, email } = req.body;
    const code = req.params.tenantCode;
    const [cnt] = await sequelize.query(`SELECT COUNT(*) as c FROM clinic_staff WHERE tenant_code=:code`, { replacements: { code }, type: sequelize.QueryTypes.SELECT });
    const mat = `STAFF-${code.slice(-4)}-${String(+cnt.c + 1).padStart(3, '0')}`;
    const [rows] = await sequelize.query(
      `INSERT INTO clinic_staff (tenant_code,nom,prenom,role,service,specialite,telephone,email,matricule) VALUES(:code,:nom,:prenom,:role,:svc,:spec,:tel,:email,:mat) RETURNING *`,
      { replacements: { code, nom, prenom, role, svc: service, spec: specialite, tel: telephone, email, mat }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true, staff: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/staff/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`UPDATE clinic_staff SET is_active=false WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── RENDEZ-VOUS ────────────────────────────────────────────────────────────

router.get('/:tenantCode/appointments', authenticate, verifyTenant, async (req, res) => {
  try {
    const { statut } = req.query;
    let q = `SELECT a.*,p.nom as p_nom,p.prenom as p_prenom,p.telephone as p_tel,s.nom as s_nom,s.prenom as s_prenom FROM clinic_appointments_mgmt a LEFT JOIN clinic_patients p ON a.patient_id=p.id LEFT JOIN clinic_staff s ON a.staff_id=s.id WHERE a.tenant_code=:code`;
    if (statut) q += ` AND a.statut=:statut`;
    q += ` ORDER BY a.date_rdv DESC, a.heure`;
    const appts = await sequelize.query(q, { replacements: { code: req.params.tenantCode, statut }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, appointments: appts });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/appointments', authenticate, verifyTenant, async (req, res) => {
  try {
    const { patient_id, staff_id, service, date_rdv, heure, motif } = req.body;
    const [rows] = await sequelize.query(
      `INSERT INTO clinic_appointments_mgmt (tenant_code,patient_id,staff_id,service,date_rdv,heure,motif) VALUES(:code,:pid,:sid,:svc,:date,:heure,:motif) RETURNING *`,
      { replacements: { code: req.params.tenantCode, pid: patient_id, sid: staff_id || null, svc: service, date: date_rdv, heure, motif }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true, appointment: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:tenantCode/appointments/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    const { statut, notes } = req.body;
    await sequelize.query(`UPDATE clinic_appointments_mgmt SET statut=:statut,notes=:notes WHERE id=:id AND tenant_code=:code`, { replacements: { statut, notes, id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── ORDONNANCES ─────────────────────────────────────────────────────────────

router.get('/:tenantCode/prescriptions', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT p.*,pt.nom as p_nom,pt.prenom as p_prenom,s.nom as s_nom FROM clinic_prescriptions p LEFT JOIN clinic_patients pt ON p.patient_id=pt.id LEFT JOIN clinic_staff s ON p.staff_id=s.id WHERE p.tenant_code=:code ORDER BY p.created_at DESC`,
      { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, prescriptions: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/prescriptions', authenticate, verifyTenant, async (req, res) => {
  try {
    const { patient_id, staff_id, medicaments, diagnostic, notes } = req.body;
    const code = req.params.tenantCode;
    const [cnt] = await sequelize.query(`SELECT COUNT(*) as c FROM clinic_prescriptions WHERE tenant_code=:code`, { replacements: { code }, type: sequelize.QueryTypes.SELECT });
    const num = `ORD-${new Date().getFullYear()}-${String(+cnt.c + 1).padStart(4, '0')}`;
    const [rows] = await sequelize.query(
      `INSERT INTO clinic_prescriptions (tenant_code,patient_id,staff_id,medicaments,diagnostic,notes,numero_ordo) VALUES(:code,:pid,:sid,:meds::jsonb,:diag,:notes,:num) RETURNING *`,
      { replacements: { code, pid: patient_id, sid: staff_id || null, meds: JSON.stringify(medicaments || []), diag: diagnostic, notes, num }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true, prescription: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── DOSSIERS MÉDICAUX ───────────────────────────────────────────────────────

router.get('/:tenantCode/records', authenticate, verifyTenant, async (req, res) => {
  try {
    const { patient_id } = req.query;
    let q = `SELECT r.*,p.nom as p_nom,p.prenom as p_prenom,s.nom as s_nom FROM clinic_medical_records r LEFT JOIN clinic_patients p ON r.patient_id=p.id LEFT JOIN clinic_staff s ON r.staff_id=s.id WHERE r.tenant_code=:code`;
    if (patient_id) q += ` AND r.patient_id=:pid`;
    q += ` ORDER BY r.date_visite DESC`;
    const rows = await sequelize.query(q, { replacements: { code: req.params.tenantCode, pid: patient_id }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, records: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/records', authenticate, verifyTenant, async (req, res) => {
  try {
    const { patient_id, staff_id, type_consultation, diagnostic, traitement, poids, tension, temperature } = req.body;
    const [rows] = await sequelize.query(
      `INSERT INTO clinic_medical_records (tenant_code,patient_id,staff_id,type_consultation,diagnostic,traitement,poids,tension,temperature) VALUES(:code,:pid,:sid,:type,:diag,:trait,:poids,:tension,:temp) RETURNING *`,
      { replacements: { code: req.params.tenantCode, pid: patient_id, sid: staff_id || null, type: type_consultation, diag: diagnostic, trait: traitement, poids: poids || null, tension, temp: temperature || null }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true, record: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── PAIEMENTS ───────────────────────────────────────────────────────────────

router.get('/:tenantCode/payments', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT p.*,pt.nom as p_nom,pt.prenom as p_prenom FROM clinic_payments_mgmt p LEFT JOIN clinic_patients pt ON p.patient_id=pt.id WHERE p.tenant_code=:code ORDER BY p.created_at DESC`,
      { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, payments: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/payments', authenticate, verifyTenant, async (req, res) => {
  try {
    const { patient_id, montant, motif, mode_paiement } = req.body;
    const recu = `REC-${Date.now()}`;
    const [rows] = await sequelize.query(
      `INSERT INTO clinic_payments_mgmt (tenant_code,patient_id,montant,motif,mode_paiement,recu_numero) VALUES(:code,:pid,:montant,:motif,:mode,:recu) RETURNING *`,
      { replacements: { code: req.params.tenantCode, pid: patient_id || null, montant, motif, mode: mode_paiement || 'especes', recu }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true, payment: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── FACTURES ────────────────────────────────────────────────────────────────

async function ensureInvoicesTable() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS clinic_invoices (
      id SERIAL PRIMARY KEY,
      tenant_code VARCHAR(50) NOT NULL,
      patient_id INTEGER,
      staff_id INTEGER,
      numero_facture VARCHAR(60),
      lignes JSONB DEFAULT '[]',
      sous_total NUMERIC(12,2) DEFAULT 0,
      remise NUMERIC(12,2) DEFAULT 0,
      total NUMERIC(12,2) DEFAULT 0,
      statut VARCHAR(20) DEFAULT 'impaye',
      mode_paiement VARCHAR(50) DEFAULT 'especes',
      notes TEXT,
      date_facture DATE DEFAULT CURRENT_DATE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
}

router.get('/:tenantCode/invoices', authenticate, verifyTenant, async (req, res) => {
  try {
    await ensureInvoicesTable();
    const rows = await sequelize.query(
      `SELECT i.*,p.nom as p_nom,p.prenom as p_prenom,s.nom as s_nom,s.prenom as s_prenom FROM clinic_invoices i LEFT JOIN clinic_patients p ON i.patient_id=p.id LEFT JOIN clinic_staff s ON i.staff_id=s.id WHERE i.tenant_code=:code ORDER BY i.created_at DESC`,
      { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, invoices: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/invoices', authenticate, verifyTenant, async (req, res) => {
  try {
    await ensureInvoicesTable();
    const { patient_id, staff_id, lignes, sous_total, remise, total, statut, mode_paiement, notes, date_facture } = req.body;
    const code = req.params.tenantCode;
    const [cnt] = await sequelize.query(`SELECT COUNT(*) as c FROM clinic_invoices WHERE tenant_code=:code`, { replacements: { code }, type: sequelize.QueryTypes.SELECT });
    const num = `FAC-${new Date().getFullYear()}-${String(+cnt.c + 1).padStart(4, '0')}`;
    const [rows] = await sequelize.query(
      `INSERT INTO clinic_invoices (tenant_code,patient_id,staff_id,numero_facture,lignes,sous_total,remise,total,statut,mode_paiement,notes,date_facture) VALUES(:code,:pid,:sid,:num,:lignes::jsonb,:st,:rem,:tot,:statut,:mode,:notes,:date) RETURNING *`,
      { replacements: { code, pid: patient_id || null, sid: staff_id || null, num, lignes: JSON.stringify(lignes || []), st: sous_total || 0, rem: remise || 0, tot: total || 0, statut: statut || 'impaye', mode: mode_paiement || 'especes', notes: notes || null, date: date_facture || null }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true, invoice: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:tenantCode/invoices/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await ensureInvoicesTable();
    const { statut, mode_paiement } = req.body;
    await sequelize.query(`UPDATE clinic_invoices SET statut=:statut,mode_paiement=:mode WHERE id=:id AND tenant_code=:code`, { replacements: { statut, mode: mode_paiement || 'especes', id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;
