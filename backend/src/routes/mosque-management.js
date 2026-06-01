import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { sequelize } from '../config/database.js';

const router = express.Router();

async function verifyTenant(req, res, next) {
  const { tenantCode } = req.params;
  const role = req.user?.role || '';
  const isAdminUser = !!(req.user?.isMasterAdmin || role === 'admin' || role === 'super-admin');
  const userNumeroH = req.user?.numeroH || req.userId;
  try {
    // Admin : accès direct sans vérifier le propriétaire
    if (isAdminUser) {
      const [tenant] = await sequelize.query(
        `SELECT * FROM management_tenants WHERE tenant_code=:code LIMIT 1`,
        { replacements: { code: tenantCode }, type: sequelize.QueryTypes.SELECT }
      );
      req.tenant = tenant || { tenant_code: tenantCode, name: 'Mosquée Admin', type: 'mosque', owner_numero_h: 'ADMIN-G7', is_active: true };
      return next();
    }

    // Vérifier si l'utilisateur est le propriétaire (imam principal)
    const [ownerTenant] = await sequelize.query(
      `SELECT * FROM management_tenants WHERE tenant_code=:code AND owner_numero_h=:n LIMIT 1`,
      { replacements: { code: tenantCode, n: userNumeroH }, type: sequelize.QueryTypes.SELECT }
    );
    if (ownerTenant) {
      req.tenant = ownerTenant;
      req.imamRang = 0; // 0 = propriétaire / imam principal
      return next();
    }

    // Vérifier si l'utilisateur est un cheikh imam enregistré (rang 1, 2 ou 3)
    const [isTenant] = await sequelize.query(
      `SELECT mt.* FROM management_tenants mt
       JOIN mosque_imams mi ON mi.tenant_code = mt.tenant_code
       WHERE mt.tenant_code=:code AND mi.numero_h=:n AND mi.is_active=true LIMIT 1`,
      { replacements: { code: tenantCode, n: userNumeroH }, type: sequelize.QueryTypes.SELECT }
    );
    if (isTenant) {
      const [imam] = await sequelize.query(
        `SELECT rang FROM mosque_imams WHERE tenant_code=:code AND numero_h=:n AND is_active=true LIMIT 1`,
        { replacements: { code: tenantCode, n: userNumeroH }, type: sequelize.QueryTypes.SELECT }
      );
      req.tenant = isTenant;
      req.imamRang = imam?.rang || 1;
      return next();
    }

    return res.status(403).json({ success: false, message: 'Accès refusé à cet espace mosquée.' });
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
    const [mem, ann, don, qst, recent] = await Promise.all([
      q(`SELECT COUNT(*) as c FROM mosque_members WHERE tenant_code=:code AND is_active=true`, { code }),
      q(`SELECT COUNT(*) as c FROM mosque_announcements WHERE tenant_code=:code AND is_active=true`, { code }),
      q(`SELECT COALESCE(SUM(montant),0) as t FROM mosque_donations WHERE tenant_code=:code AND EXTRACT(MONTH FROM date_don)=EXTRACT(MONTH FROM CURRENT_DATE)`, { code }),
      q(`SELECT COUNT(*) as c FROM mosque_quran_students WHERE tenant_code=:code AND statut='actif'`, { code }),
      sequelize.query(`SELECT * FROM mosque_announcements WHERE tenant_code=:code AND is_active=true ORDER BY created_at DESC LIMIT 3`, { replacements: { code }, type: sequelize.QueryTypes.SELECT }).catch(() => []),
    ]);
    res.json({ success: true, totalMembers: +(mem.c||0), totalAnnouncements: +(ann.c||0), donsMois: +(don.t||0), quranStudents: +(qst.c||0), recentAnnouncements: recent });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── MEMBRES ──────────────────────────────────────────────────────────────────
router.get('/:tenantCode/members', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(`SELECT * FROM mosque_members WHERE tenant_code=:code AND is_active=true ORDER BY role,nom`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, members: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/members', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, prenom, telephone, numero_h, role } = req.body;
    const [rows] = await sequelize.query(
      `INSERT INTO mosque_members (tenant_code,nom,prenom,telephone,numero_h,role) VALUES(:code,:nom,:prenom,:tel,:n,:role) RETURNING *`,
      { replacements: { code: req.params.tenantCode, nom, prenom: prenom || null, tel: telephone || null, n: numero_h || null, role: role || 'fidèle' }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true, member: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/members/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`UPDATE mosque_members SET is_active=false WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── ANNONCES ─────────────────────────────────────────────────────────────────
router.get('/:tenantCode/announcements', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(`SELECT * FROM mosque_announcements WHERE tenant_code=:code AND is_active=true ORDER BY created_at DESC`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, announcements: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/announcements', authenticate, verifyTenant, async (req, res) => {
  try {
    const { titre, contenu, type } = req.body;
    const [rows] = await sequelize.query(
      `INSERT INTO mosque_announcements (tenant_code,titre,contenu,type) VALUES(:code,:titre,:contenu,:type) RETURNING *`,
      { replacements: { code: req.params.tenantCode, titre, contenu, type: type || 'general' }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true, announcement: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/announcements/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`UPDATE mosque_announcements SET is_active=false WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── DONATIONS ────────────────────────────────────────────────────────────────
router.get('/:tenantCode/donations', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(`SELECT * FROM mosque_donations WHERE tenant_code=:code ORDER BY date_don DESC LIMIT 50`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, donations: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/donations', authenticate, verifyTenant, async (req, res) => {
  try {
    const { donateur_nom, montant, type_don } = req.body;
    const [rows] = await sequelize.query(
      `INSERT INTO mosque_donations (tenant_code,donateur_nom,montant,type_don) VALUES(:code,:nom,:montant,:type) RETURNING *`,
      { replacements: { code: req.params.tenantCode, nom: donateur_nom || 'Anonyme', montant, type: type_don || 'sadaqa' }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true, donation: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── ÉLÈVES CORAN ─────────────────────────────────────────────────────────────
router.get('/:tenantCode/quran-students', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT q.*,m.nom as enseignant_nom FROM mosque_quran_students q LEFT JOIN mosque_members m ON q.enseignant_id=m.id WHERE q.tenant_code=:code AND q.statut='actif' ORDER BY q.nom`,
      { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, students: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/quran-students', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, prenom, niveau_coran, telephone_parent, enseignant_id } = req.body;
    const [rows] = await sequelize.query(
      `INSERT INTO mosque_quran_students (tenant_code,nom,prenom,niveau_coran,telephone_parent,enseignant_id) VALUES(:code,:nom,:prenom,:niveau,:tel,:ens) RETURNING *`,
      { replacements: { code: req.params.tenantCode, nom, prenom: prenom || null, niveau: niveau_coran || 'Débutant', tel: telephone_parent || null, ens: enseignant_id || null }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true, student: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── CHEIKH IMAMS (jusqu'à 3 par mosquée) ────────────────────────────────────

// GET /:tenantCode/imams → liste des 3 imams
router.get('/:tenantCode/imams', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT * FROM mosque_imams WHERE tenant_code=:code AND is_active=true ORDER BY rang`,
      { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, imams: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST /:tenantCode/imams → ajouter ou remplacer un imam à un rang donné (1, 2 ou 3)
router.post('/:tenantCode/imams', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, prenom, telephone, numero_h, rang } = req.body;
    const rangInt = Math.min(Math.max(parseInt(rang) || 1, 1), 3); // clamp 1-3
    const code = req.params.tenantCode;

    // Upsert : si déjà un imam à ce rang, on le remplace
    await sequelize.query(
      `INSERT INTO mosque_imams (tenant_code, rang, nom, prenom, telephone, numero_h)
       VALUES (:code, :rang, :nom, :prenom, :tel, :n)
       ON CONFLICT (tenant_code, rang) DO UPDATE
       SET nom=:nom, prenom=:prenom, telephone=:tel, numero_h=:n, is_active=true`,
      { replacements: { code, rang: rangInt, nom, prenom: prenom || null, tel: telephone || null, n: numero_h || null } }
    );

    const [imam] = await sequelize.query(
      `SELECT * FROM mosque_imams WHERE tenant_code=:code AND rang=:rang`,
      { replacements: { code, rang: rangInt }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, imam });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// DELETE /:tenantCode/imams/:rang → retirer un imam d'un rang
router.delete('/:tenantCode/imams/:rang', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(
      `UPDATE mosque_imams SET is_active=false WHERE tenant_code=:code AND rang=:rang`,
      { replacements: { code: req.params.tenantCode, rang: parseInt(req.params.rang) } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── PRÉDICATIONS (Khutbas / Cours) ──────────────────────────────────────────
router.get('/:tenantCode/predications', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(`SELECT * FROM mosque_predications WHERE tenant_code=:code ORDER BY date_pred DESC LIMIT 100`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, predications: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/predications', authenticate, verifyTenant, async (req, res) => {
  try {
    const { titre, type, contenu, sourate, date_pred } = req.body;
    const [rows] = await sequelize.query(
      `INSERT INTO mosque_predications (tenant_code,titre,type,contenu,sourate,date_pred) VALUES(:code,:titre,:type,:contenu,:sourate,:date) RETURNING *`,
      { replacements: { code: req.params.tenantCode, titre, type: type || 'khutba', contenu: contenu || null, sourate: sourate || null, date: date_pred || new Date().toISOString().slice(0,10) }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true, predication: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/predications/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`DELETE FROM mosque_predications WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── MOSQUÉES PARTENAIRES ─────────────────────────────────────────────────────
router.get('/:tenantCode/partenaires', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(`SELECT * FROM mosque_partenaires WHERE tenant_code=:code ORDER BY nom_mosquee`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, partenaires: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/partenaires', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom_mosquee, ville, imam_nom, telephone } = req.body;
    const [rows] = await sequelize.query(
      `INSERT INTO mosque_partenaires (tenant_code,nom_mosquee,ville,imam_nom,telephone) VALUES(:code,:nom,:ville,:imam,:tel) RETURNING *`,
      { replacements: { code: req.params.tenantCode, nom: nom_mosquee, ville: ville || null, imam: imam_nom || null, tel: telephone || null }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true, partenaire: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/partenaires/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`DELETE FROM mosque_partenaires WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── GESTIONNAIRES DE QUARTIER ────────────────────────────────────────────────

// GET /quartier-managers/:quartierNom → récupérer chef + gestionnaire d'un quartier
router.get('/quartier-managers/:quartierNom', authenticate, async (req, res) => {
  try {
    const [mgr] = await sequelize.query(
      `SELECT * FROM quartier_managers WHERE quartier_nom=:nom LIMIT 1`,
      { replacements: { nom: req.params.quartierNom }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, manager: mgr || null });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST /quartier-managers → définir chef + gestionnaire (admin ou chef de quartier)
router.post('/quartier-managers', authenticate, async (req, res) => {
  try {
    const { quartier_nom, chef_numero_h, chef_nom, gestionnaire_numero_h, gestionnaire_nom } = req.body;
    if (!quartier_nom) return res.status(400).json({ success: false, message: 'Nom du quartier requis.' });

    await sequelize.query(
      `INSERT INTO quartier_managers (quartier_nom, chef_numero_h, chef_nom, gestionnaire_numero_h, gestionnaire_nom, updated_at)
       VALUES (:qnom, :cn, :cnom, :gn, :gnom, NOW())
       ON CONFLICT (quartier_nom) DO UPDATE
       SET chef_numero_h=:cn, chef_nom=:cnom, gestionnaire_numero_h=:gn, gestionnaire_nom=:gnom, updated_at=NOW()`,
      { replacements: { qnom: quartier_nom, cn: chef_numero_h || null, cnom: chef_nom || null, gn: gestionnaire_numero_h || null, gnom: gestionnaire_nom || null } }
    );

    const [mgr] = await sequelize.query(
      `SELECT * FROM quartier_managers WHERE quartier_nom=:nom LIMIT 1`,
      { replacements: { nom: quartier_nom }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, manager: mgr });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;
