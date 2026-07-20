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
      req.tenant = tenant || { tenant_code: tenantCode, name: 'Média Admin', type: 'journalist', owner_numero_h: 'ADMIN-G7', is_active: true };
      return next();
    }
    const [tenant] = await sequelize.query(
      `SELECT * FROM management_tenants WHERE tenant_code=:code AND owner_numero_h=:n LIMIT 1`,
      { replacements: { code: tenantCode, n: userNumeroH }, type: sequelize.QueryTypes.SELECT }
    );
    if (!tenant) return res.status(403).json({ success: false, message: 'Accès refusé à cet espace Média.' });
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
    const [reporters, articles, subs, anns, recent] = await Promise.all([
      q(`SELECT COUNT(*) as c FROM journalist_reporters WHERE tenant_code=:code AND is_active=true`, { code }),
      q(`SELECT COUNT(*) as c FROM journalist_articles WHERE tenant_code=:code AND statut='publie'`, { code }),
      q(`SELECT COUNT(*) as c FROM journalist_subscribers WHERE tenant_code=:code AND is_active=true`, { code }),
      q(`SELECT COUNT(*) as c FROM journalist_announcements WHERE tenant_code=:code AND is_active=true`, { code }),
      sequelize.query(`SELECT * FROM journalist_articles WHERE tenant_code=:code ORDER BY date_pub DESC LIMIT 5`, { replacements: { code }, type: sequelize.QueryTypes.SELECT }).catch(() => []),
    ]);
    res.json({ success: true, totalReporters: +(reporters.c||0), totalArticles: +(articles.c||0), totalSubscribers: +(subs.c||0), totalAnnouncements: +(anns.c||0), recentArticles: recent });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── JOURNALISTES ─────────────────────────────────────────────────────────────
router.get('/:tenantCode/reporters', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(`SELECT * FROM journalist_reporters WHERE tenant_code=:code AND is_active=true ORDER BY nom`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, reporters: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/reporters', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, prenom, telephone, numero_h, specialite, role } = req.body;
    if (!nom) return res.status(400).json({ success: false, message: 'Nom obligatoire.' });
    await sequelize.query(
      `INSERT INTO journalist_reporters (tenant_code,nom,prenom,telephone,numero_h,specialite,role) VALUES (:code,:nom,:prenom,:tel,:nh,:spec,:role)`,
      { replacements: { code: req.params.tenantCode, nom, prenom: prenom||'', tel: telephone||'', nh: numero_h||'', spec: specialite||'Général', role: role||'journaliste' }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/reporters/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`UPDATE journalist_reporters SET is_active=false WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode }, type: sequelize.QueryTypes.UPDATE });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── ARTICLES ─────────────────────────────────────────────────────────────────
router.get('/:tenantCode/articles', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(`SELECT * FROM journalist_articles WHERE tenant_code=:code ORDER BY date_pub DESC`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, articles: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/articles', authenticate, verifyTenant, async (req, res) => {
  try {
    const { reporter_id, reporter_nom, titre, contenu, categorie, statut, date_pub } = req.body;
    if (!titre) return res.status(400).json({ success: false, message: 'Titre obligatoire.' });
    await sequelize.query(
      `INSERT INTO journalist_articles (tenant_code,reporter_id,reporter_nom,titre,contenu,categorie,statut,date_pub) VALUES (:code,:rid,:rnom,:titre,:contenu,:cat,:statut,:date)`,
      { replacements: { code: req.params.tenantCode, rid: reporter_id||null, rnom: reporter_nom||'', titre, contenu: contenu||'', cat: categorie||'Actualité', statut: statut||'brouillon', date: date_pub||new Date().toISOString().split('T')[0] }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/:tenantCode/articles/:id/statut', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`UPDATE journalist_articles SET statut=:statut WHERE id=:id AND tenant_code=:code`, { replacements: { statut: req.body.statut, id: req.params.id, code: req.params.tenantCode }, type: sequelize.QueryTypes.UPDATE });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/articles/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`DELETE FROM journalist_articles WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode }, type: sequelize.QueryTypes.DELETE });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── ABONNÉS ──────────────────────────────────────────────────────────────────
router.get('/:tenantCode/subscribers', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(`SELECT * FROM journalist_subscribers WHERE tenant_code=:code AND is_active=true ORDER BY nom`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, subscribers: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/subscribers', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, telephone, email, type_abo } = req.body;
    if (!nom) return res.status(400).json({ success: false, message: 'Nom obligatoire.' });
    await sequelize.query(
      `INSERT INTO journalist_subscribers (tenant_code,nom,telephone,email,type_abo) VALUES (:code,:nom,:tel,:email,:abo)`,
      { replacements: { code: req.params.tenantCode, nom, tel: telephone||'', email: email||'', abo: type_abo||'gratuit' }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/subscribers/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`UPDATE journalist_subscribers SET is_active=false WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode }, type: sequelize.QueryTypes.UPDATE });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── ANNONCES ─────────────────────────────────────────────────────────────────
router.get('/:tenantCode/announcements', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(`SELECT * FROM journalist_announcements WHERE tenant_code=:code AND is_active=true ORDER BY created_at DESC`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, announcements: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/announcements', authenticate, verifyTenant, async (req, res) => {
  try {
    const { titre, contenu, type } = req.body;
    if (!titre || !contenu) return res.status(400).json({ success: false, message: 'Titre et contenu obligatoires.' });
    await sequelize.query(
      `INSERT INTO journalist_announcements (tenant_code,titre,contenu,type) VALUES (:code,:titre,:contenu,:type)`,
      { replacements: { code: req.params.tenantCode, titre, contenu, type: type||'general' }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/announcements/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`UPDATE journalist_announcements SET is_active=false WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode }, type: sequelize.QueryTypes.UPDATE });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;
