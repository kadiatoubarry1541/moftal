import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { sequelize } from '../config/database.js';
import { enforceGestionAccess } from '../middleware/gestionAccessGuard.js';
import { ajouterRouteRapport } from '../utils/routeRapport.js';
import { avecAccesEmployes, ajouterRoutesAccesEmployes } from '../utils/accesEmployes.js';

const router = express.Router();

// Vérifie qu'un bien / un locataire appartient bien à CET établissement avant de
// l'utiliser (sinon on pourrait rattacher les données d'une autre agence).
// Renvoie un message d'erreur, ou null si tout est correct (ou si l'id est vide).
async function verifierAppartenance(code, { property_id, tenant_id }) {
  if (property_id) {
    const [p] = await sequelize.query(
      `SELECT id FROM immo_properties WHERE id=:id AND tenant_code=:code LIMIT 1`,
      { replacements: { id: property_id, code }, type: sequelize.QueryTypes.SELECT }
    );
    if (!p) return 'Bien introuvable dans cet établissement.';
  }
  if (tenant_id) {
    const [t] = await sequelize.query(
      `SELECT id FROM immo_tenants WHERE id=:id AND tenant_code=:code LIMIT 1`,
      { replacements: { id: tenant_id, code }, type: sequelize.QueryTypes.SELECT }
    );
    if (!t) return 'Locataire introuvable dans cet établissement.';
  }
  return null;
}

// Employés autorisés par le propriétaire (voir utils/accesEmployes.js)
const verifyTenant = avecAccesEmployes(verifyTenantProprietaire);

async function verifyTenantProprietaire(req, res, next) {
  const { tenantCode } = req.params;
  const role = req.user?.role || '';
  const isAdminUser = !!(req.user?.isMasterAdmin || role === 'admin' || role === 'super-admin');
  try {
    if (isAdminUser) {
      const [tenant] = await sequelize.query(
        `SELECT * FROM management_tenants WHERE tenant_code=:code LIMIT 1`,
        { replacements: { code: tenantCode }, type: sequelize.QueryTypes.SELECT }
      );
      req.tenant = tenant || { tenant_code: tenantCode, name: 'Immobilier Admin', type: 'immobilier', owner_numero_h: 'ADMIN-G7', is_active: true };
      return next();
    }
    const [tenant] = await sequelize.query(
      `SELECT * FROM management_tenants WHERE tenant_code=:code AND owner_numero_h=:n LIMIT 1`,
      { replacements: { code: tenantCode, n: req.userId }, type: sequelize.QueryTypes.SELECT }
    );
    if (!tenant) return res.status(403).json({ success: false, message: 'Accès refusé à cet espace immobilier.' });
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
    // Une erreur SQL remonte (500) : jamais de faux « 0 » affiché.
    const q = (sql, rep) => sequelize.query(sql, { replacements: rep, type: sequelize.QueryTypes.SELECT })
      .then(r => r[0] || {});

    const [total, vacants, loyes, impayes, maintenance, annonces, recent] = await Promise.all([
      q(`SELECT COUNT(*) as c FROM immo_properties WHERE tenant_code=:code`, { code }),
      q(`SELECT COUNT(*) as c FROM immo_properties WHERE tenant_code=:code AND statut='vacant'`, { code }),
      q(`SELECT COALESCE(SUM(montant),0) as t FROM immo_payments WHERE tenant_code=:code AND date_paiement >= date_trunc('month', CURRENT_DATE) AND date_paiement < date_trunc('month', CURRENT_DATE) + interval '1 month' AND statut='paye'`, { code }),
      // Loyers non soldés : paiements enregistrés « partiel » ou « en attente »
      q(`SELECT COUNT(*) as c, COALESCE(SUM(montant),0) as t FROM immo_payments WHERE tenant_code=:code AND statut <> 'paye'`, { code }),
      q(`SELECT COUNT(*) as c FROM immo_maintenance WHERE tenant_code=:code AND statut='en_cours'`, { code }),
      q(`SELECT COUNT(*) as c FROM immo_announcements WHERE tenant_code=:code`, { code }),
      sequelize.query(`SELECT p.*, t.nom as locataire_nom FROM immo_payments p LEFT JOIN immo_tenants t ON p.tenant_id=t.id AND t.tenant_code=p.tenant_code WHERE p.tenant_code=:code ORDER BY p.date_paiement DESC LIMIT 5`, { replacements: { code }, type: sequelize.QueryTypes.SELECT }),
    ]);

    res.json({
      success: true,
      totalProperties: +(total.c || 0),
      propertiesVacantes: +(vacants.c || 0),
      loyersMois: +(loyes.t || 0),
      loyersOccupes: +(total.c || 0) - +(vacants.c || 0),
      loyersNonPayes: +(impayes.c || 0),
      loyersNonPayesMontant: +(impayes.t || 0),
      maintenanceEnCours: +(maintenance.c || 0),
      totalAnnouncements: +(annonces.c || 0),
      recentPayments: recent,
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── PROPRIÉTÉS ───────────────────────────────────────────────────────────────
router.get('/:tenantCode/properties', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT * FROM immo_properties WHERE tenant_code=:code ORDER BY created_at DESC`,
      { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, properties: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/properties', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, type_bien, adresse, ville, surface, nb_pieces, loyer_mensuel, charges, statut, description } = req.body;
    const code = req.params.tenantCode;
    await sequelize.query(
      `INSERT INTO immo_properties (tenant_code,nom,type_bien,adresse,ville,surface,nb_pieces,loyer_mensuel,charges,statut,description) VALUES(:code,:nom,:type,:adresse,:ville,:surface,:pieces,:loyer,:charges,:statut,:desc)`,
      { replacements: { code, nom, type: type_bien || 'appartement', adresse: adresse || '', ville: ville || '', surface: surface || null, pieces: nb_pieces || null, loyer: loyer_mensuel || 0, charges: charges || 0, statut: statut || 'vacant', desc: description || null } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/:tenantCode/properties/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    const { statut } = req.body;
    await sequelize.query(
      `UPDATE immo_properties SET statut=:statut WHERE id=:id AND tenant_code=:code`,
      { replacements: { statut, id: req.params.id, code: req.params.tenantCode } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/properties/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`DELETE FROM immo_properties WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── LOCATAIRES ───────────────────────────────────────────────────────────────
router.get('/:tenantCode/tenants', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT t.*, p.nom as property_nom FROM immo_tenants t LEFT JOIN immo_properties p ON t.property_id=p.id AND p.tenant_code=t.tenant_code WHERE t.tenant_code=:code ORDER BY t.created_at DESC`,
      { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, tenants: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/tenants', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, prenom, telephone, email, cni, property_id, date_entree, loyer, caution } = req.body;
    const code = req.params.tenantCode;
    const erreur = await verifierAppartenance(code, { property_id });
    if (erreur) return res.status(400).json({ success: false, message: erreur });
    await sequelize.query(
      `INSERT INTO immo_tenants (tenant_code,nom,prenom,telephone,email,cni,property_id,date_entree,loyer,caution) VALUES(:code,:nom,:prenom,:tel,:email,:cni,:prop,:entree,:loyer,:caution)`,
      { replacements: { code, nom, prenom: prenom || '', tel: telephone || '', email: email || null, cni: cni || null, prop: property_id || null, entree: date_entree || null, loyer: loyer || 0, caution: caution || 0 } }
    );
    if (property_id) {
      await sequelize.query(`UPDATE immo_properties SET statut='occupe' WHERE id=:id AND tenant_code=:code`, { replacements: { id: property_id, code } }).catch(() => {});
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/tenants/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    const [loc] = await sequelize.query(`SELECT property_id FROM immo_tenants WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    await sequelize.query(`DELETE FROM immo_tenants WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    if (loc?.property_id) {
      await sequelize.query(`UPDATE immo_properties SET statut='vacant' WHERE id=:id AND tenant_code=:code`, { replacements: { id: loc.property_id, code: req.params.tenantCode } }).catch(() => {});
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── PAIEMENTS LOYERS ─────────────────────────────────────────────────────────
router.get('/:tenantCode/payments', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT p.*, t.nom as locataire_nom, t.prenom as locataire_prenom, t.telephone as locataire_tel, pr.nom as property_nom FROM immo_payments p LEFT JOIN immo_tenants t ON p.tenant_id=t.id AND t.tenant_code=p.tenant_code LEFT JOIN immo_properties pr ON p.property_id=pr.id AND pr.tenant_code=p.tenant_code WHERE p.tenant_code=:code ORDER BY p.date_paiement DESC LIMIT 100`,
      { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, payments: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/payments', authenticate, verifyTenant, async (req, res) => {
  try {
    const { tenant_id, property_id, montant, mois_concerne, type_paiement, statut, notes } = req.body;
    const code = req.params.tenantCode;
    const erreur = await verifierAppartenance(code, { property_id, tenant_id });
    if (erreur) return res.status(400).json({ success: false, message: erreur });
    await sequelize.query(
      `INSERT INTO immo_payments (tenant_code,tenant_id,property_id,montant,mois_concerne,type_paiement,statut,notes) VALUES(:code,:tid,:pid,:montant,:mois,:type,:statut,:notes)`,
      { replacements: { code, tid: tenant_id || null, pid: property_id || null, montant: montant || 0, mois: mois_concerne || null, type: type_paiement || 'especes', statut: statut || 'paye', notes: notes || null } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── MAINTENANCE ──────────────────────────────────────────────────────────────
router.get('/:tenantCode/maintenance', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT m.*, p.nom as property_nom FROM immo_maintenance m LEFT JOIN immo_properties p ON m.property_id=p.id AND p.tenant_code=m.tenant_code WHERE m.tenant_code=:code ORDER BY m.created_at DESC`,
      { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, maintenance: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/maintenance', authenticate, verifyTenant, async (req, res) => {
  try {
    const { property_id, titre, description, type_intervention, priorite, cout_estime } = req.body;
    const code = req.params.tenantCode;
    const erreur = await verifierAppartenance(code, { property_id });
    if (erreur) return res.status(400).json({ success: false, message: erreur });
    await sequelize.query(
      `INSERT INTO immo_maintenance (tenant_code,property_id,titre,description,type_intervention,priorite,cout_estime,statut) VALUES(:code,:pid,:titre,:desc,:type,:prio,:cout,'en_cours')`,
      { replacements: { code, pid: property_id || null, titre, desc: description || '', type: type_intervention || 'reparation', prio: priorite || 'normale', cout: cout_estime || 0 } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/:tenantCode/maintenance/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    const { statut } = req.body;
    await sequelize.query(
      `UPDATE immo_maintenance SET statut=:statut WHERE id=:id AND tenant_code=:code`,
      { replacements: { statut, id: req.params.id, code: req.params.tenantCode } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── ANNONCES ─────────────────────────────────────────────────────────────────
router.get('/:tenantCode/announcements', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT * FROM immo_announcements WHERE tenant_code=:code ORDER BY created_at DESC`,
      { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, announcements: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/announcements', authenticate, verifyTenant, async (req, res) => {
  try {
    const { titre, contenu, type } = req.body;
    await sequelize.query(
      `INSERT INTO immo_announcements (tenant_code,titre,contenu,type) VALUES(:code,:titre,:contenu,:type)`,
      { replacements: { code: req.params.tenantCode, titre, contenu, type: type || 'general' } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/announcements/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`DELETE FROM immo_announcements WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});


// ── Rapport du mois (recettes, dépenses, bénéfice) ──
ajouterRouteRapport(router, [authenticate, verifyTenant], {
  recettes: [{ label: 'Loyers encaissés', table: 'immo_payments', montant: 'montant', date: 'date_paiement', where: "statut = 'paye'" }],
  depenses: [{ label: 'Entretien et réparations', table: 'immo_maintenance', montant: 'cout_estime', date: 'created_at', where: "statut <> 'annule'" }],
});

// ── Accès des employés (géré par le propriétaire uniquement) ──
ajouterRoutesAccesEmployes(router, [authenticate, verifyTenantProprietaire]);

export default router;
