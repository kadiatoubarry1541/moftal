import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { sequelize } from '../config/database.js';

const router = express.Router();

// ─── ROUTES PUBLIQUES (sans auth) ──────────────────────────────────────────

// GET /api/clinic-public/:tenantCode — infos publiques de la clinique
router.get('/:tenantCode', async (req, res) => {
  try {
    const { tenantCode } = req.params;
    const [tenant] = await sequelize.query(
      `SELECT tenant_code, type, name, logo_url, address, phone, email, description
       FROM management_tenants
       WHERE tenant_code = :code AND type = 'clinic' AND is_active = true
       LIMIT 1`,
      { replacements: { code: tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    if (!tenant) return res.status(404).json({ success: false, message: 'Clinique introuvable.' });
    res.json({ success: true, clinic: tenant });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/clinic-public/:tenantCode/staff — médecins et personnel public
router.get('/:tenantCode/staff', async (req, res) => {
  try {
    const { tenantCode } = req.params;
    const staff = await sequelize.query(
      `SELECT id, nom, prenom, role, service, specialite
       FROM clinic_staff
       WHERE tenant_code = :code AND is_active = true
       ORDER BY role, nom`,
      { replacements: { code: tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, staff });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/clinic-public/:tenantCode/services — liste des services disponibles
router.get('/:tenantCode/services', async (req, res) => {
  try {
    const { tenantCode } = req.params;
    const rows = await sequelize.query(
      `SELECT DISTINCT service FROM clinic_staff
       WHERE tenant_code = :code AND is_active = true AND service IS NOT NULL
       ORDER BY service`,
      { replacements: { code: tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    const services = rows.map(r => r.service).filter(Boolean);
    res.json({ success: true, services });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── ESPACE PATIENT (auth requis + doit être enregistré dans cette clinique) ─

// GET /api/clinic-public/:tenantCode/my-portal — vérifier si patient enregistré + données
router.get('/:tenantCode/my-portal', authenticate, async (req, res) => {
  try {
    const { tenantCode } = req.params;
    const numeroH = req.userId;

    // Vérifier si la clinique existe et est active
    const [tenant] = await sequelize.query(
      `SELECT tenant_code, name, logo_url, address, phone, email
       FROM management_tenants WHERE tenant_code = :code AND is_active = true LIMIT 1`,
      { replacements: { code: tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    if (!tenant) return res.status(404).json({ success: false, message: 'Clinique introuvable.' });

    // Vérifier si ce patient est enregistré dans cette clinique
    const [patient] = await sequelize.query(
      `SELECT * FROM clinic_patients WHERE tenant_code = :code AND numero_h = :nh LIMIT 1`,
      { replacements: { code: tenantCode, nh: numeroH }, type: sequelize.QueryTypes.SELECT }
    );
    if (!patient) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas enregistré dans cette clinique. Contactez l\'accueil pour vous inscrire.',
        not_registered: true
      });
    }

    // Charger les données patient en parallèle
    const [appointments, prescriptions, records] = await Promise.all([
      sequelize.query(
        `SELECT a.*, s.nom as s_nom, s.prenom as s_prenom, s.role as s_role
         FROM clinic_appointments_mgmt a
         LEFT JOIN clinic_staff s ON a.staff_id = s.id
         WHERE a.tenant_code = :code AND a.patient_id = :pid
         ORDER BY a.date_rdv DESC LIMIT 20`,
        { replacements: { code: tenantCode, pid: patient.id }, type: sequelize.QueryTypes.SELECT }
      ).catch(() => []),
      sequelize.query(
        `SELECT p.*, s.nom as s_nom, s.prenom as s_prenom
         FROM clinic_prescriptions p
         LEFT JOIN clinic_staff s ON p.staff_id = s.id
         WHERE p.tenant_code = :code AND p.patient_id = :pid
         ORDER BY p.created_at DESC LIMIT 20`,
        { replacements: { code: tenantCode, pid: patient.id }, type: sequelize.QueryTypes.SELECT }
      ).catch(() => []),
      sequelize.query(
        `SELECT r.*, s.nom as s_nom, s.prenom as s_prenom
         FROM clinic_medical_records r
         LEFT JOIN clinic_staff s ON r.staff_id = s.id
         WHERE r.tenant_code = :code AND r.patient_id = :pid
         ORDER BY r.created_at DESC LIMIT 20`,
        { replacements: { code: tenantCode, pid: patient.id }, type: sequelize.QueryTypes.SELECT }
      ).catch(() => []),
    ]);

    res.json({ success: true, clinic: tenant, patient, appointments, prescriptions, records });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /api/clinic-public/:tenantCode/request-appointment — patient demande un RDV
router.post('/:tenantCode/request-appointment', authenticate, async (req, res) => {
  try {
    const { tenantCode } = req.params;
    const numeroH = req.userId;
    const { service, date_rdv, heure, motif } = req.body;

    const [patient] = await sequelize.query(
      `SELECT * FROM clinic_patients WHERE tenant_code = :code AND numero_h = :nh LIMIT 1`,
      { replacements: { code: tenantCode, nh: numeroH }, type: sequelize.QueryTypes.SELECT }
    );
    if (!patient) return res.status(403).json({ success: false, message: 'Non enregistré dans cette clinique.' });

    if (!date_rdv) return res.status(400).json({ success: false, message: 'Date du rendez-vous requise.' });

    const [rows] = await sequelize.query(
      `INSERT INTO clinic_appointments_mgmt (tenant_code, patient_id, service, date_rdv, heure, motif, statut)
       VALUES (:code, :pid, :svc, :date, :heure, :motif, 'pending')
       RETURNING *`,
      { replacements: { code: tenantCode, pid: patient.id, svc: service || null, date: date_rdv, heure: heure || null, motif: motif || null }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true, appointment: rows[0] });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
