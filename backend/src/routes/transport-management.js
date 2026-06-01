import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { sequelize } from '../config/database.js';

const router = express.Router();

async function verifyTenant(req, res, next) {
  const { tenantCode } = req.params;
  const role = req.user?.role || '';
  const isAdminUser = !!(req.user?.isMasterAdmin || role === 'admin' || role === 'super-admin');
  try {
    if (isAdminUser) {
      const [tenant] = await sequelize.query(
        `SELECT * FROM management_tenants WHERE tenant_code=:code LIMIT 1`,
        { replacements: { code: tenantCode }, type: sequelize.QueryTypes.SELECT }
      );
      req.tenant = tenant || { tenant_code: tenantCode, name: 'Transport Admin', type: 'transport', owner_numero_h: 'ADMIN-G7', is_active: true };
      return next();
    }
    const [tenant] = await sequelize.query(
      `SELECT * FROM management_tenants WHERE tenant_code=:code AND owner_numero_h=:n LIMIT 1`,
      { replacements: { code: tenantCode, n: req.userId }, type: sequelize.QueryTypes.SELECT }
    );
    if (!tenant) return res.status(403).json({ success: false, message: 'Accès refusé à cet espace transport.' });
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
    const q = (sql, rep) => sequelize.query(sql, { replacements: rep, type: sequelize.QueryTypes.SELECT })
      .then(r => r[0]).catch(() => ({ c: 0, t: 0 }));

    const [vehicles, drivers, tripsToday, caMonth, reservations, annonces, recentTrips] = await Promise.all([
      q(`SELECT COUNT(*) as c FROM transport_vehicles WHERE tenant_code=:code AND statut='actif'`, { code }),
      q(`SELECT COUNT(*) as c FROM transport_drivers WHERE tenant_code=:code AND statut='disponible'`, { code }),
      q(`SELECT COUNT(*) as c FROM transport_trips WHERE tenant_code=:code AND DATE(date_depart)=CURRENT_DATE`, { code }),
      q(`SELECT COALESCE(SUM(montant),0) as t FROM transport_bookings WHERE tenant_code=:code AND EXTRACT(MONTH FROM created_at)=EXTRACT(MONTH FROM CURRENT_DATE) AND statut='confirme'`, { code }),
      q(`SELECT COUNT(*) as c FROM transport_bookings WHERE tenant_code=:code AND statut='en_attente'`, { code }),
      q(`SELECT COUNT(*) as c FROM transport_announcements WHERE tenant_code=:code`, { code }),
      sequelize.query(
        `SELECT t.*, d.nom as chauffeur_nom FROM transport_trips t LEFT JOIN transport_drivers d ON t.driver_id=d.id WHERE t.tenant_code=:code ORDER BY t.date_depart DESC LIMIT 5`,
        { replacements: { code }, type: sequelize.QueryTypes.SELECT }
      ).catch(() => []),
    ]);

    res.json({
      success: true,
      vehiculesActifs: +(vehicles.c || 0),
      chauffeursDisponibles: +(drivers.c || 0),
      trajetsAujourdhui: +(tripsToday.c || 0),
      caMonth: +(caMonth.t || 0),
      reservationsEnAttente: +(reservations.c || 0),
      totalAnnonces: +(annonces.c || 0),
      recentTrips,
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── VÉHICULES ────────────────────────────────────────────────────────────────
router.get('/:tenantCode/vehicles', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT v.*, d.nom as chauffeur_nom, d.prenom as chauffeur_prenom FROM transport_vehicles v LEFT JOIN transport_drivers d ON v.driver_id=d.id WHERE v.tenant_code=:code ORDER BY v.created_at DESC`,
      { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, vehicles: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/vehicles', authenticate, verifyTenant, async (req, res) => {
  try {
    const { immatriculation, type_vehicule, marque, capacite, driver_id, description } = req.body;
    const code = req.params.tenantCode;
    await sequelize.query(
      `INSERT INTO transport_vehicles (tenant_code,immatriculation,type_vehicule,marque,capacite,driver_id,description) VALUES(:code,:immat,:type,:marque,:cap,:driver,:desc)`,
      { replacements: { code, immat: immatriculation, type: type_vehicule, marque: marque || null, cap: +capacite || 4, driver: driver_id || null, desc: description || null } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/:tenantCode/vehicles/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    const { statut, driver_id } = req.body;
    const sets = []; const rep = { id: req.params.id, code: req.params.tenantCode };
    if (statut    !== undefined) { sets.push('statut=:statut');       rep.statut    = statut; }
    if (driver_id !== undefined) { sets.push('driver_id=:driver_id'); rep.driver_id = driver_id || null; }
    if (sets.length) await sequelize.query(`UPDATE transport_vehicles SET ${sets.join(',')} WHERE id=:id AND tenant_code=:code`, { replacements: rep });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/vehicles/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`DELETE FROM transport_vehicles WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── CHAUFFEURS ───────────────────────────────────────────────────────────────
router.get('/:tenantCode/drivers', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT * FROM transport_drivers WHERE tenant_code=:code ORDER BY created_at DESC`,
      { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, drivers: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/drivers', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, prenom, telephone, permis, type_permis, salaire, notes } = req.body;
    await sequelize.query(
      `INSERT INTO transport_drivers (tenant_code,nom,prenom,telephone,permis,type_permis,salaire,notes) VALUES(:code,:nom,:prenom,:tel,:permis,:typepermis,:salaire,:notes)`,
      { replacements: { code: req.params.tenantCode, nom, prenom: prenom || null, tel: telephone || null, permis: permis || null, typepermis: type_permis || null, salaire: +salaire || 0, notes: notes || null } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/:tenantCode/drivers/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    const { statut } = req.body;
    await sequelize.query(`UPDATE transport_drivers SET statut=:statut WHERE id=:id AND tenant_code=:code`, { replacements: { statut, id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/drivers/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`DELETE FROM transport_drivers WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── TRAJETS ──────────────────────────────────────────────────────────────────
router.get('/:tenantCode/trips', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT t.*, d.nom as chauffeur_nom, v.immatriculation as vehicule_immat FROM transport_trips t LEFT JOIN transport_drivers d ON t.driver_id=d.id LEFT JOIN transport_vehicles v ON t.vehicle_id=v.id WHERE t.tenant_code=:code ORDER BY t.date_depart DESC`,
      { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, trips: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/trips', authenticate, verifyTenant, async (req, res) => {
  try {
    const { lieu_depart, lieu_arrivee, date_depart, heure_depart, prix, places_total, driver_id, vehicle_id, notes } = req.body;
    const places = +places_total || 4;
    await sequelize.query(
      `INSERT INTO transport_trips (tenant_code,lieu_depart,lieu_arrivee,date_depart,heure_depart,prix,places_total,places_restantes,driver_id,vehicle_id,notes) VALUES(:code,:dep,:arr,:date,:heure,:prix,:places,:places,:driver,:vehicle,:notes)`,
      { replacements: { code: req.params.tenantCode, dep: lieu_depart, arr: lieu_arrivee, date: date_depart, heure: heure_depart || null, prix: +prix || 0, places, driver: driver_id || null, vehicle: vehicle_id || null, notes: notes || null } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/:tenantCode/trips/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    const { statut } = req.body;
    await sequelize.query(`UPDATE transport_trips SET statut=:statut WHERE id=:id AND tenant_code=:code`, { replacements: { statut, id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/trips/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`DELETE FROM transport_trips WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── RÉSERVATIONS ─────────────────────────────────────────────────────────────
router.get('/:tenantCode/bookings', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT b.*, t.lieu_depart, t.lieu_arrivee, t.date_depart FROM transport_bookings b LEFT JOIN transport_trips t ON b.trip_id=t.id WHERE b.tenant_code=:code ORDER BY b.created_at DESC`,
      { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, bookings: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/bookings', authenticate, verifyTenant, async (req, res) => {
  try {
    const { trip_id, client_nom, client_telephone, places, montant, notes } = req.body;
    const p = +places || 1;
    await sequelize.query(
      `INSERT INTO transport_bookings (tenant_code,trip_id,client_nom,client_telephone,places,montant,notes) VALUES(:code,:trip,:nom,:tel,:places,:montant,:notes)`,
      { replacements: { code: req.params.tenantCode, trip: trip_id || null, nom: client_nom, tel: client_telephone || null, places: p, montant: +montant || 0, notes: notes || null } }
    );
    if (trip_id) {
      await sequelize.query(
        `UPDATE transport_trips SET places_restantes=GREATEST(0,places_restantes-:p) WHERE id=:id AND tenant_code=:code`,
        { replacements: { p, id: trip_id, code: req.params.tenantCode } }
      );
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/:tenantCode/bookings/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    const { statut } = req.body;
    await sequelize.query(`UPDATE transport_bookings SET statut=:statut WHERE id=:id AND tenant_code=:code`, { replacements: { statut, id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── ANNONCES ─────────────────────────────────────────────────────────────────
router.get('/:tenantCode/announcements', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT * FROM transport_announcements WHERE tenant_code=:code ORDER BY created_at DESC`,
      { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, announcements: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/announcements', authenticate, verifyTenant, async (req, res) => {
  try {
    const { titre, contenu, type } = req.body;
    await sequelize.query(
      `INSERT INTO transport_announcements (tenant_code,titre,contenu,type) VALUES(:code,:titre,:contenu,:type)`,
      { replacements: { code: req.params.tenantCode, titre, contenu, type: type || 'general' } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/announcements/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`DELETE FROM transport_announcements WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── LIVRAISONS ───────────────────────────────────────────────────────────────
router.get('/:tenantCode/deliveries', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT d.*, dr.nom as chauffeur_nom, v.immatriculation as vehicule_immat FROM transport_deliveries d LEFT JOIN transport_drivers dr ON d.driver_id=dr.id LEFT JOIN transport_vehicles v ON d.vehicle_id=v.id WHERE d.tenant_code=:code ORDER BY d.created_at DESC`,
      { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, deliveries: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/deliveries', authenticate, verifyTenant, async (req, res) => {
  try {
    const { client_nom, client_telephone, adresse_collecte, adresse_livraison, description, poids, montant, driver_id, vehicle_id, notes } = req.body;
    await sequelize.query(
      `INSERT INTO transport_deliveries (tenant_code,client_nom,client_telephone,adresse_collecte,adresse_livraison,description,poids,montant,driver_id,vehicle_id,notes) VALUES(:code,:nom,:tel,:collecte,:livraison,:desc,:poids,:montant,:driver,:vehicle,:notes)`,
      { replacements: { code: req.params.tenantCode, nom: client_nom, tel: client_telephone || null, collecte: adresse_collecte, livraison: adresse_livraison, desc: description || null, poids: +poids || 0, montant: +montant || 0, driver: driver_id || null, vehicle: vehicle_id || null, notes: notes || null } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/:tenantCode/deliveries/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    const { statut } = req.body;
    await sequelize.query(`UPDATE transport_deliveries SET statut=:statut WHERE id=:id AND tenant_code=:code`, { replacements: { statut, id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/deliveries/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`DELETE FROM transport_deliveries WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;
