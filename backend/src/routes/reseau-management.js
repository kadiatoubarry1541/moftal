import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { sequelize } from '../config/database.js';

const router = express.Router();

async function verifyTenant(req, res, next) {
  const { tenantCode } = req.params;
  const isAdminUser = !!(req.user?.isMasterAdmin || req.user?.role === 'admin' || req.user?.role === 'super-admin');
  const userNumeroH = req.user?.numeroH || req.userId;
  try {
    if (isAdminUser) {
      const [tenant] = await sequelize.query(`SELECT * FROM management_tenants WHERE tenant_code=:code LIMIT 1`, { replacements: { code: tenantCode }, type: sequelize.QueryTypes.SELECT });
      req.tenant = tenant || { tenant_code: tenantCode, name: 'Réseau Admin', type: 'reseau', owner_numero_h: 'ADMIN-G7', is_active: true };
      return next();
    }
    const [tenant] = await sequelize.query(`SELECT * FROM management_tenants WHERE tenant_code=:code AND owner_numero_h=:n LIMIT 1`, { replacements: { code: tenantCode, n: userNumeroH }, type: sequelize.QueryTypes.SELECT });
    if (!tenant) return res.status(403).json({ success: false, message: 'Accès refusé à ce réseau.' });
    req.tenant = tenant;
    next();
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
    const [mem, ann, proj, cot, recent] = await Promise.all([
      q(`SELECT COUNT(*) as c FROM reseau_members WHERE tenant_code=:code AND is_active=true`, { code }),
      q(`SELECT COUNT(*) as c FROM reseau_announcements WHERE tenant_code=:code AND is_active=true`, { code }),
      q(`SELECT COUNT(*) as c FROM reseau_projets WHERE tenant_code=:code AND statut='en_cours'`, { code }),
      q(`SELECT COALESCE(SUM(montant),0) as t FROM reseau_cotisations WHERE tenant_code=:code AND est_paye=true AND EXTRACT(YEAR FROM date_paiement)=EXTRACT(YEAR FROM CURRENT_DATE)`, { code }),
      sequelize.query(`SELECT * FROM reseau_announcements WHERE tenant_code=:code AND is_active=true ORDER BY created_at DESC LIMIT 3`, { replacements: { code }, type: sequelize.QueryTypes.SELECT }).catch(() => []),
    ]);
    res.json({ success: true, totalMembers: +(mem.c||0), totalAnnouncements: +(ann.c||0), projetsEnCours: +(proj.c||0), cotisationsAnnee: +(cot.t||0), recentAnnouncements: recent });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── MEMBRES ──────────────────────────────────────────────────────────────────
router.get('/:tenantCode/members', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(`SELECT * FROM reseau_members WHERE tenant_code=:code AND is_active=true ORDER BY role,nom`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, members: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/members', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, prenom, telephone, numero_h, role, email } = req.body;
    const [rows] = await sequelize.query(
      `INSERT INTO reseau_members (tenant_code,nom,prenom,telephone,numero_h,role,email) VALUES(:code,:nom,:prenom,:tel,:n,:role,:email) RETURNING *`,
      { replacements: { code: req.params.tenantCode, nom, prenom: prenom||null, tel: telephone||null, n: numero_h||null, role: role||'membre', email: email||null }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true, member: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/members/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`UPDATE reseau_members SET is_active=false WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── PROJETS ──────────────────────────────────────────────────────────────────
router.get('/:tenantCode/projets', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(`SELECT * FROM reseau_projets WHERE tenant_code=:code ORDER BY created_at DESC`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, projets: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/projets', authenticate, verifyTenant, async (req, res) => {
  try {
    const { titre, description, statut, date_debut, date_fin, responsable } = req.body;
    const [rows] = await sequelize.query(
      `INSERT INTO reseau_projets (tenant_code,titre,description,statut,date_debut,date_fin,responsable) VALUES(:code,:titre,:desc,:statut,:debut,:fin,:resp) RETURNING *`,
      { replacements: { code: req.params.tenantCode, titre, desc: description||null, statut: statut||'en_cours', debut: date_debut||null, fin: date_fin||null, resp: responsable||null }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true, projet: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:tenantCode/projets/:id/statut', authenticate, verifyTenant, async (req, res) => {
  try {
    const { statut } = req.body;
    await sequelize.query(`UPDATE reseau_projets SET statut=:s WHERE id=:id AND tenant_code=:code`, { replacements: { s: statut, id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/projets/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`DELETE FROM reseau_projets WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── COTISATIONS ──────────────────────────────────────────────────────────────
router.get('/:tenantCode/cotisations', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(`SELECT * FROM reseau_cotisations WHERE tenant_code=:code ORDER BY created_at DESC LIMIT 200`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, cotisations: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/cotisations', authenticate, verifyTenant, async (req, res) => {
  try {
    const { membre_nom, montant, type_cot, periode } = req.body;
    const [rows] = await sequelize.query(
      `INSERT INTO reseau_cotisations (tenant_code,membre_nom,montant,type_cot,periode,est_paye,date_paiement) VALUES(:code,:nom,:montant,:type,:periode,true,NOW()) RETURNING *`,
      { replacements: { code: req.params.tenantCode, nom: membre_nom||'Anonyme', montant: montant||0, type: type_cot||'mensuelle', periode: periode||null }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true, cotisation: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── ANNONCES ─────────────────────────────────────────────────────────────────
router.get('/:tenantCode/announcements', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(`SELECT * FROM reseau_announcements WHERE tenant_code=:code AND is_active=true ORDER BY created_at DESC`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, announcements: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/announcements', authenticate, verifyTenant, async (req, res) => {
  try {
    const { titre, contenu, type } = req.body;
    const [rows] = await sequelize.query(
      `INSERT INTO reseau_announcements (tenant_code,titre,contenu,type) VALUES(:code,:titre,:contenu,:type) RETURNING *`,
      { replacements: { code: req.params.tenantCode, titre, contenu, type: type||'general' }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true, announcement: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/announcements/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`UPDATE reseau_announcements SET is_active=false WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;
