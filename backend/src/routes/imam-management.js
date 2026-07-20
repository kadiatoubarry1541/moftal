import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { sequelize } from '../config/database.js';
import { enforceGestionAccess } from '../middleware/gestionAccessGuard.js';

const router = express.Router();

async function verifyTenant(req, res, next) {
  const { tenantCode } = req.params;
  const isAdminUser = !!(req.user?.isMasterAdmin || req.user?.role === 'admin' || req.user?.role === 'super-admin');
  const userNumeroH = req.user?.numeroH || req.userId;
  try {
    if (isAdminUser) {
      const [tenant] = await sequelize.query(
        `SELECT * FROM management_tenants WHERE tenant_code=:code LIMIT 1`,
        { replacements: { code: tenantCode }, type: sequelize.QueryTypes.SELECT }
      );
      req.tenant = tenant || { tenant_code: tenantCode, name: 'Réseau Imam Admin', type: 'imam', owner_numero_h: 'ADMIN-G7', is_active: true };
      return next();
    }
    const [tenant] = await sequelize.query(
      `SELECT * FROM management_tenants WHERE tenant_code=:code AND owner_numero_h=:n LIMIT 1`,
      { replacements: { code: tenantCode, n: userNumeroH }, type: sequelize.QueryTypes.SELECT }
    );
    if (!tenant) return res.status(403).json({ success: false, message: 'Accès refusé à cet espace Réseau Imam.' });
    req.tenant = tenant;
    return enforceGestionAccess(req, res, next);
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}

// ─── INFO ─────────────────────────────────────────────────────────────────────
router.get('/:tenantCode/info', authenticate, verifyTenant, (req, res) => {
  res.json({ success: true, tenant: req.tenant });
});

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
router.get('/:tenantCode/dashboard', authenticate, verifyTenant, async (req, res) => {
  try {
    const code = req.params.tenantCode;
    const q = (sql, rep) => sequelize.query(sql, { replacements: rep, type: sequelize.QueryTypes.SELECT }).then(r => r[0]).catch(() => ({ c: 0, t: 0 }));
    const [imams, preds, msqs, anns, mems, dons, quran, recent] = await Promise.all([
      q(`SELECT COUNT(*) as c FROM imam_network_imams WHERE tenant_code=:code AND is_active=true`, { code }),
      q(`SELECT COUNT(*) as c FROM imam_network_predications WHERE tenant_code=:code AND date_pred >= date_trunc('month', CURRENT_DATE)`, { code }),
      q(`SELECT COUNT(*) as c FROM imam_network_mosques WHERE tenant_code=:code AND is_active=true`, { code }),
      q(`SELECT COUNT(*) as c FROM imam_network_announcements WHERE tenant_code=:code AND is_active=true`, { code }),
      q(`SELECT COUNT(*) as c FROM imam_network_members WHERE tenant_code=:code AND is_active=true`, { code }),
      q(`SELECT COALESCE(SUM(montant),0) as t FROM imam_network_donations WHERE tenant_code=:code AND EXTRACT(MONTH FROM date_don)=EXTRACT(MONTH FROM CURRENT_DATE)`, { code }),
      q(`SELECT COUNT(*) as c FROM imam_network_quran_students WHERE tenant_code=:code AND statut='actif'`, { code }),
      sequelize.query(`SELECT * FROM imam_network_predications WHERE tenant_code=:code ORDER BY date_pred DESC LIMIT 5`, { replacements: { code }, type: sequelize.QueryTypes.SELECT }).catch(() => []),
    ]);
    res.json({ success: true, totalImams: +(imams.c||0), predsMois: +(preds.c||0), totalMosques: +(msqs.c||0), totalAnnouncements: +(anns.c||0), totalMembers: +(mems.c||0), donsMois: +(dons.t||0), quranStudents: +(quran.c||0), recentPredications: recent });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── IMAMS ────────────────────────────────────────────────────────────────────
router.get('/:tenantCode/imams', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(`SELECT * FROM imam_network_imams WHERE tenant_code=:code AND is_active=true ORDER BY nom`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, imams: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/imams', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, prenom, telephone, numero_h, specialite, mosquee } = req.body;
    if (!nom) return res.status(400).json({ success: false, message: 'Nom obligatoire.' });
    await sequelize.query(
      `INSERT INTO imam_network_imams (tenant_code, nom, prenom, telephone, numero_h, specialite, mosquee) VALUES (:code,:nom,:prenom,:tel,:nh,:spec,:msq)`,
      { replacements: { code: req.params.tenantCode, nom, prenom: prenom||'', tel: telephone||'', nh: numero_h||'', spec: specialite||'Général', msq: mosquee||'' }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/imams/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`UPDATE imam_network_imams SET is_active=false WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode }, type: sequelize.QueryTypes.UPDATE });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── PRÉDICATIONS ─────────────────────────────────────────────────────────────
router.get('/:tenantCode/predications', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(`SELECT * FROM imam_network_predications WHERE tenant_code=:code ORDER BY date_pred DESC`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, predications: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/predications', authenticate, verifyTenant, async (req, res) => {
  try {
    const { imam_id, imam_nom, titre, type_pred, date_pred, mosquee, notes } = req.body;
    if (!titre) return res.status(400).json({ success: false, message: 'Titre obligatoire.' });
    await sequelize.query(
      `INSERT INTO imam_network_predications (tenant_code, imam_id, imam_nom, titre, type_pred, date_pred, mosquee, notes) VALUES (:code,:iid,:inom,:titre,:type,:date,:msq,:notes)`,
      { replacements: { code: req.params.tenantCode, iid: imam_id||null, inom: imam_nom||'', titre, type: type_pred||'khutba', date: date_pred||new Date().toISOString().split('T')[0], msq: mosquee||'', notes: notes||'' }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/predications/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`DELETE FROM imam_network_predications WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode }, type: sequelize.QueryTypes.DELETE });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── MOSQUÉES PARTENAIRES ─────────────────────────────────────────────────────
router.get('/:tenantCode/mosques', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(`SELECT * FROM imam_network_mosques WHERE tenant_code=:code AND is_active=true ORDER BY nom`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, mosques: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/mosques', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, adresse, responsable, telephone } = req.body;
    if (!nom) return res.status(400).json({ success: false, message: 'Nom obligatoire.' });
    await sequelize.query(
      `INSERT INTO imam_network_mosques (tenant_code, nom, adresse, responsable, telephone) VALUES (:code,:nom,:adr,:resp,:tel)`,
      { replacements: { code: req.params.tenantCode, nom, adr: adresse||'', resp: responsable||'', tel: telephone||'' }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/mosques/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`UPDATE imam_network_mosques SET is_active=false WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode }, type: sequelize.QueryTypes.UPDATE });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── ANNONCES ─────────────────────────────────────────────────────────────────
router.get('/:tenantCode/announcements', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(`SELECT * FROM imam_network_announcements WHERE tenant_code=:code AND is_active=true ORDER BY created_at DESC`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, announcements: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/announcements', authenticate, verifyTenant, async (req, res) => {
  try {
    const { titre, contenu, type } = req.body;
    if (!titre || !contenu) return res.status(400).json({ success: false, message: 'Titre et contenu obligatoires.' });
    await sequelize.query(
      `INSERT INTO imam_network_announcements (tenant_code, titre, contenu, type) VALUES (:code,:titre,:contenu,:type)`,
      { replacements: { code: req.params.tenantCode, titre, contenu, type: type||'general' }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/announcements/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`UPDATE imam_network_announcements SET is_active=false WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode }, type: sequelize.QueryTypes.UPDATE });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── FIDÈLES (MEMBRES) ────────────────────────────────────────────────────────
router.get('/:tenantCode/members', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(`SELECT * FROM imam_network_members WHERE tenant_code=:code AND is_active=true ORDER BY role,nom`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, members: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/members', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, prenom, telephone, numero_h, role } = req.body;
    if (!nom) return res.status(400).json({ success: false, message: 'Nom obligatoire.' });
    const [rows] = await sequelize.query(
      `INSERT INTO imam_network_members (tenant_code,nom,prenom,telephone,numero_h,role) VALUES(:code,:nom,:prenom,:tel,:n,:role) RETURNING *`,
      { replacements: { code: req.params.tenantCode, nom, prenom: prenom||null, tel: telephone||null, n: numero_h||null, role: role||'fidèle' }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true, member: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/members/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`UPDATE imam_network_members SET is_active=false WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── DONS ─────────────────────────────────────────────────────────────────────
router.get('/:tenantCode/donations', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(`SELECT * FROM imam_network_donations WHERE tenant_code=:code ORDER BY date_don DESC LIMIT 50`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, donations: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/donations', authenticate, verifyTenant, async (req, res) => {
  try {
    const { donateur_nom, montant, type_don } = req.body;
    if (!montant) return res.status(400).json({ success: false, message: 'Montant obligatoire.' });
    const [rows] = await sequelize.query(
      `INSERT INTO imam_network_donations (tenant_code,donateur_nom,montant,type_don) VALUES(:code,:nom,:montant,:type) RETURNING *`,
      { replacements: { code: req.params.tenantCode, nom: donateur_nom||'Anonyme', montant, type: type_don||'sadaqa' }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true, donation: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── ÉLÈVES CORAN ─────────────────────────────────────────────────────────────
router.get('/:tenantCode/quran-students', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(`SELECT * FROM imam_network_quran_students WHERE tenant_code=:code AND statut='actif' ORDER BY nom`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, students: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/quran-students', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, prenom, niveau_coran, telephone_parent } = req.body;
    if (!nom) return res.status(400).json({ success: false, message: 'Nom obligatoire.' });
    const [rows] = await sequelize.query(
      `INSERT INTO imam_network_quran_students (tenant_code,nom,prenom,niveau_coran,telephone_parent) VALUES(:code,:nom,:prenom,:niveau,:tel) RETURNING *`,
      { replacements: { code: req.params.tenantCode, nom, prenom: prenom||null, niveau: niveau_coran||'Débutant', tel: telephone_parent||null }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true, student: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/quran-students/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`UPDATE imam_network_quran_students SET statut='inactif' WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;
