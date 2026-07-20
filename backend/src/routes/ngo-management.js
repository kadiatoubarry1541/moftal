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
      req.tenant = tenant || { tenant_code: tenantCode, name: 'ONG Admin', type: 'ngo', owner_numero_h: 'ADMIN-G7', is_active: true };
      return next();
    }
    const [tenant] = await sequelize.query(
      `SELECT * FROM management_tenants WHERE tenant_code=:code AND owner_numero_h=:n LIMIT 1`,
      { replacements: { code: tenantCode, n: userNumeroH }, type: sequelize.QueryTypes.SELECT }
    );
    if (!tenant) return res.status(403).json({ success: false, message: 'Accès refusé à cet espace ONG.' });
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
    const [mems, projs, dons, anns, recent] = await Promise.all([
      q(`SELECT COUNT(*) as c FROM ngo_members WHERE tenant_code=:code AND is_active=true`, { code }),
      q(`SELECT COUNT(*) as c FROM ngo_projects WHERE tenant_code=:code AND statut='en_cours'`, { code }),
      q(`SELECT COALESCE(SUM(montant),0) as t FROM ngo_donations WHERE tenant_code=:code AND EXTRACT(MONTH FROM date_don)=EXTRACT(MONTH FROM CURRENT_DATE)`, { code }),
      q(`SELECT COUNT(*) as c FROM ngo_announcements WHERE tenant_code=:code AND is_active=true`, { code }),
      sequelize.query(`SELECT * FROM ngo_projects WHERE tenant_code=:code ORDER BY created_at DESC LIMIT 5`, { replacements: { code }, type: sequelize.QueryTypes.SELECT }).catch(() => []),
    ]);
    res.json({ success: true, totalMembers: +(mems.c||0), projetsEnCours: +(projs.c||0), donsMois: +(dons.t||0), totalAnnouncements: +(anns.c||0), recentProjects: recent });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── MEMBRES / BÉNÉVOLES ──────────────────────────────────────────────────────
router.get('/:tenantCode/members', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(`SELECT * FROM ngo_members WHERE tenant_code=:code AND is_active=true ORDER BY role,nom`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, members: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/members', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, prenom, telephone, numero_h, role, competence } = req.body;
    if (!nom) return res.status(400).json({ success: false, message: 'Nom obligatoire.' });
    await sequelize.query(
      `INSERT INTO ngo_members (tenant_code,nom,prenom,telephone,numero_h,role,competence) VALUES (:code,:nom,:prenom,:tel,:nh,:role,:comp)`,
      { replacements: { code: req.params.tenantCode, nom, prenom: prenom||'', tel: telephone||'', nh: numero_h||'', role: role||'bénévole', comp: competence||'' }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/members/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`UPDATE ngo_members SET is_active=false WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode }, type: sequelize.QueryTypes.UPDATE });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── PROJETS ──────────────────────────────────────────────────────────────────
router.get('/:tenantCode/projects', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(`SELECT * FROM ngo_projects WHERE tenant_code=:code ORDER BY created_at DESC`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, projects: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/projects', authenticate, verifyTenant, async (req, res) => {
  try {
    const { titre, description, statut, date_debut, date_fin, budget } = req.body;
    if (!titre) return res.status(400).json({ success: false, message: 'Titre obligatoire.' });
    await sequelize.query(
      `INSERT INTO ngo_projects (tenant_code,titre,description,statut,date_debut,date_fin,budget) VALUES (:code,:titre,:desc,:statut,:dd,:df,:budget)`,
      { replacements: { code: req.params.tenantCode, titre, desc: description||'', statut: statut||'en_cours', dd: date_debut||new Date().toISOString().split('T')[0], df: date_fin||null, budget: budget||0 }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/:tenantCode/projects/:id/statut', authenticate, verifyTenant, async (req, res) => {
  try {
    const { statut } = req.body;
    await sequelize.query(`UPDATE ngo_projects SET statut=:statut WHERE id=:id AND tenant_code=:code`, { replacements: { statut, id: req.params.id, code: req.params.tenantCode }, type: sequelize.QueryTypes.UPDATE });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/projects/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`DELETE FROM ngo_projects WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode }, type: sequelize.QueryTypes.DELETE });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── DONS / COLLECTES ─────────────────────────────────────────────────────────
router.get('/:tenantCode/donations', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(`SELECT * FROM ngo_donations WHERE tenant_code=:code ORDER BY date_don DESC`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, donations: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/donations', authenticate, verifyTenant, async (req, res) => {
  try {
    const { donateur_nom, montant, type_don, projet_id, projet_titre, date_don } = req.body;
    if (!montant) return res.status(400).json({ success: false, message: 'Montant obligatoire.' });
    await sequelize.query(
      `INSERT INTO ngo_donations (tenant_code,donateur_nom,montant,type_don,projet_id,projet_titre,date_don) VALUES (:code,:dnom,:montant,:type,:pid,:ptit,:date)`,
      { replacements: { code: req.params.tenantCode, dnom: donateur_nom||'Anonyme', montant, type: type_don||'financier', pid: projet_id||null, ptit: projet_titre||'', date: date_don||new Date().toISOString().split('T')[0] }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/donations/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`DELETE FROM ngo_donations WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode }, type: sequelize.QueryTypes.DELETE });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── ANNONCES ─────────────────────────────────────────────────────────────────
router.get('/:tenantCode/announcements', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(`SELECT * FROM ngo_announcements WHERE tenant_code=:code AND is_active=true ORDER BY created_at DESC`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, announcements: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/announcements', authenticate, verifyTenant, async (req, res) => {
  try {
    const { titre, contenu, type } = req.body;
    if (!titre || !contenu) return res.status(400).json({ success: false, message: 'Titre et contenu obligatoires.' });
    await sequelize.query(
      `INSERT INTO ngo_announcements (tenant_code,titre,contenu,type) VALUES (:code,:titre,:contenu,:type)`,
      { replacements: { code: req.params.tenantCode, titre, contenu, type: type||'general' }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/announcements/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`UPDATE ngo_announcements SET is_active=false WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode }, type: sequelize.QueryTypes.UPDATE });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;
