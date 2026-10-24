/**
 * Gestion Interne — Juridique (cabinet d'avocats, cabinet de conseil juridique)
 * Préfixe : /api/juridique-mgmt/:tenantCode
 * Tables   : juridique_services, juridique_staff, juridique_bookings,
 *            juridique_clients, juridique_dossiers, juridique_announcements
 *
 * Secteur 100 % privé : les cabinets (types 'lawyer' et 'legal_advisor')
 * gèrent leurs prestations, rendez-vous, équipe, clients et dossiers.
 * Les dossiers restent dans la gestion : jamais affichés sur le site.
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { sequelize } from '../config/database.js';
import { enforceGestionAccess } from '../middleware/gestionAccessGuard.js';
import { ajouterRouteRapport } from '../utils/routeRapport.js';
import { ajouterRouteParametres } from '../utils/routeParametres.js';
import { avecAccesEmployes, ajouterRoutesAccesEmployes } from '../utils/accesEmployes.js';

const router = express.Router();

let tablesPretes = null;
export const preparerTablesJuridique = () => (tablesPretes ||= sequelize.query(`
  CREATE TABLE IF NOT EXISTS "juridique_services" (
    "id"           SERIAL PRIMARY KEY,
    "tenant_code"  VARCHAR(50)  NOT NULL,
    "nom"          VARCHAR(255) NOT NULL,
    "categorie"    VARCHAR(100) DEFAULT 'Conseil',
    "prix"         NUMERIC(14,2) DEFAULT 0,
    "duree_min"    INTEGER DEFAULT 60,
    "description"  TEXT,
    "image_url"    TEXT,
    "is_active"    BOOLEAN DEFAULT true,
    "created_at"   TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS "juridique_staff" (
    "id"           SERIAL PRIMARY KEY,
    "tenant_code"  VARCHAR(50)  NOT NULL,
    "nom"          VARCHAR(255) NOT NULL,
    "prenom"       VARCHAR(255),
    "poste"        VARCHAR(100) DEFAULT 'Avocat',
    "telephone"    VARCHAR(50),
    "specialite"   VARCHAR(255),
    "salaire"      NUMERIC(14,2) DEFAULT 0,
    "is_active"    BOOLEAN DEFAULT true,
    "created_at"   TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS "juridique_bookings" (
    "id"               SERIAL PRIMARY KEY,
    "tenant_code"      VARCHAR(50)  NOT NULL,
    "client_nom"       VARCHAR(255) NOT NULL,
    "client_telephone" VARCHAR(50),
    "service_id"       INTEGER REFERENCES "juridique_services"("id") ON DELETE SET NULL,
    "staff_id"         INTEGER REFERENCES "juridique_staff"("id") ON DELETE SET NULL,
    "date_rdv"         DATE NOT NULL,
    "heure_rdv"        VARCHAR(10),
    "statut"           VARCHAR(20) DEFAULT 'en_attente',
    "notes"            TEXT,
    "created_at"       TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS "juridique_clients" (
    "id"           SERIAL PRIMARY KEY,
    "tenant_code"  VARCHAR(50)  NOT NULL,
    "nom"          VARCHAR(255) NOT NULL,
    "telephone"    VARCHAR(50),
    "email"        VARCHAR(255),
    "notes"        TEXT,
    "is_active"    BOOLEAN DEFAULT true,
    "created_at"   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE ("tenant_code", "nom")
  );
  CREATE TABLE IF NOT EXISTS "juridique_dossiers" (
    "id"                SERIAL PRIMARY KEY,
    "tenant_code"       VARCHAR(50)  NOT NULL,
    "reference"         VARCHAR(50),
    "titre"             VARCHAR(255) NOT NULL,
    "client_nom"        VARCHAR(255),
    "client_telephone"  VARCHAR(50),
    "domaine"           VARCHAR(100),
    "responsable_id"    INTEGER REFERENCES "juridique_staff"("id") ON DELETE SET NULL,
    "prochaine_etape"   VARCHAR(255),
    "date_echeance"     DATE,
    "honoraires"        NUMERIC(14,2) DEFAULT 0,
    "montant_paye"      NUMERIC(14,2) DEFAULT 0,
    "statut"            VARCHAR(20) DEFAULT 'ouvert',
    "notes"             TEXT,
    "created_at"        TIMESTAMPTZ DEFAULT NOW(),
    "updated_at"        TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS "juridique_announcements" (
    "id"           SERIAL PRIMARY KEY,
    "tenant_code"  VARCHAR(50)  NOT NULL,
    "titre"        VARCHAR(255) NOT NULL,
    "contenu"      TEXT NOT NULL,
    "type"         VARCHAR(30) DEFAULT 'general',
    "created_at"   TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS "idx_juridique_services_tenant"  ON "juridique_services"  ("tenant_code");
  CREATE INDEX IF NOT EXISTS "idx_juridique_bookings_tenant"  ON "juridique_bookings"  ("tenant_code", "date_rdv" DESC);
  CREATE INDEX IF NOT EXISTS "idx_juridique_dossiers_tenant"  ON "juridique_dossiers"  ("tenant_code", "statut");
`).catch((e) => { tablesPretes = null; throw e; }));

// ─── Exemple de l'admin (DEMO-REF-JURI) ──────────────────────────────────────
// Le cabinet de référence est rempli une seule fois avec des exemples, pour voir
// la gestion et le site avec des données. Il n'apparaît dans aucune liste publique
// (les listes excluent les codes DEMO-REF-). Les dates suivent le jour courant.
const CODE_EXEMPLE = 'DEMO-REF-JURI';
export async function remplirExempleJuridique() {
  await preparerTablesJuridique();
  const [deja] = await select(`SELECT COUNT(*)::int AS n FROM juridique_services WHERE tenant_code=:code`, { code: CODE_EXEMPLE });
  if (deja?.n > 0) return;
  const code = CODE_EXEMPLE;
  await sequelize.query(
    `UPDATE management_tenants SET
       description = COALESCE(description, 'Cabinet d''avocats exemple : conseil et défense en droit foncier, de la famille et des affaires, à Conakry.'),
       phone = COALESCE(phone, '+224 620 00 00 00'),
       address = COALESCE(address, 'Kaloum, Conakry')
     WHERE tenant_code = :code`,
    { replacements: { code } }
  ).catch(() => {});
  await sequelize.query(`
    INSERT INTO juridique_services (tenant_code, nom, categorie, prix, duree_min, description) VALUES
      (:code, 'Consultation juridique', 'Conseil', 300000, 60, 'Premier rendez-vous : étude de votre situation et conseils.'),
      (:code, 'Litige foncier et terrain', 'Foncier', 0, 60, 'Vérification des titres, conflits de limites, défense devant le tribunal.'),
      (:code, 'Succession et héritage', 'Famille', 0, 60, 'Partage de l''héritage, accompagnement des familles.'),
      (:code, 'Divorce et garde des enfants', 'Famille', 0, 60, 'Accompagnement et défense des intérêts de la famille.'),
      (:code, 'Rédaction de contrats', 'Contrats', 500000, 90, 'Bail, vente, prestation de services, partenariat.'),
      (:code, 'Création d''entreprise', 'Création d''entreprise', 1500000, 90, 'Statuts, formalités et conseils au démarrage.'),
      (:code, 'Droit du travail', 'Travail', 0, 60, 'Licenciement, contrat de travail, litige avec un employeur.'),
      (:code, 'Recouvrement de créances', 'Recouvrement', 0, 60, 'Récupérer une somme due, à l''amiable ou en justice.');
    INSERT INTO juridique_staff (tenant_code, nom, prenom, poste, telephone, specialite, salaire) VALUES
      (:code, 'Diallo', 'Mamadou', 'Avocat associé', '+224 620 11 11 11', 'Droit foncier, droit des affaires', 0),
      (:code, 'Camara', 'Fatoumata', 'Avocat', '+224 621 22 22 22', 'Droit de la famille', 0),
      (:code, 'Soumah', 'Ibrahima', 'Juriste', '+224 622 33 33 33', 'Contrats, droit du travail', 4000000),
      (:code, 'Bah', 'Aissatou', 'Secrétaire', '+224 623 44 44 44', 'Accueil et rendez-vous', 2500000);
    INSERT INTO juridique_clients (tenant_code, nom, telephone, email, notes) VALUES
      (:code, 'Alpha Sow', '+224 624 10 20 30', '', 'Litige de terrain à Kipé'),
      (:code, 'Mariama Condé', '+224 625 10 20 30', 'mariama.conde@exemple.gn', 'Succession familiale'),
      (:code, 'Société Kankan Distribution', '+224 626 10 20 30', 'contact@exemple.gn', 'Contrats commerciaux'),
      (:code, 'Ousmane Keïta', '+224 627 10 20 30', '', 'Litige avec son employeur'),
      (:code, 'Hawa Touré', '+224 628 10 20 30', '', 'Création d''une boutique');
    INSERT INTO juridique_announcements (tenant_code, titre, contenu, type) VALUES
      (:code, 'Permanence du samedi', 'Le cabinet vous reçoit aussi le samedi matin, de 9 h à 12 h, sur rendez-vous.', 'general'),
      (:code, 'Fermeture exceptionnelle', 'Le cabinet sera fermé le jour de la fête nationale. Les rendez-vous sont reportés au lendemain.', 'fermeture');
  `, { replacements: { code } });
  const ids = await select(`SELECT id, nom FROM juridique_services WHERE tenant_code=:code`, { code });
  const svc = (nom) => ids.find(r => r.nom === nom)?.id || null;
  const staff = await select(`SELECT id, nom FROM juridique_staff WHERE tenant_code=:code`, { code });
  const avocat = (nom) => staff.find(r => r.nom === nom)?.id || null;
  const rdv = [
    ['Alpha Sow', '+224 624 10 20 30', 'Litige foncier et terrain', 'Diallo', 0, '09:00', 'confirme', 'Apporter le titre foncier'],
    ['Mariama Condé', '+224 625 10 20 30', 'Succession et héritage', 'Camara', 0, '11:30', 'en_attente', ''],
    ['Hawa Touré', '+224 628 10 20 30', "Création d'entreprise", 'Soumah', 1, '10:00', 'en_attente', 'Boutique de tissus à Madina'],
    ['Ousmane Keïta', '+224 627 10 20 30', 'Droit du travail', 'Soumah', 2, '15:00', 'confirme', ''],
    ['Société Kankan Distribution', '+224 626 10 20 30', 'Rédaction de contrats', 'Diallo', -3, '14:00', 'termine', 'Contrat de distribution signé'],
    ['Alpha Sow', '+224 624 10 20 30', 'Consultation juridique', 'Diallo', -10, '09:30', 'termine', ''],
  ];
  for (const [nom, tel, service, staffNom, jours, heure, statut, notes] of rdv) {
    await sequelize.query(
      `INSERT INTO juridique_bookings (tenant_code, client_nom, client_telephone, service_id, staff_id, date_rdv, heure_rdv, statut, notes)
       VALUES (:code, :nom, :tel, :sid, :stid, CURRENT_DATE + CAST(:jours AS INTEGER), :heure, :statut, :notes)`,
      { replacements: { code, nom, tel, sid: svc(service), stid: avocat(staffNom), jours, heure, statut, notes } }
    );
  }
  const dossiers = [
    ['Litige de terrain à Kipé', 'Alpha Sow', '+224 624 10 20 30', 'Foncier', 'Diallo', 'Audience au tribunal', 3, 8000000, 4000000, 'en_cours', 'Le voisin conteste les limites du terrain. Titre foncier vérifié.'],
    ['Succession de la famille Condé', 'Mariama Condé', '+224 625 10 20 30', 'Famille', 'Camara', 'Réunion de famille au cabinet', 6, 5000000, 1500000, 'en_cours', ''],
    ['Contrats de distribution', 'Société Kankan Distribution', '+224 626 10 20 30', 'Contrats', 'Diallo', 'Envoi des contrats signés', 12, 3000000, 3000000, 'en_cours', ''],
    ['Licenciement contesté', 'Ousmane Keïta', '+224 627 10 20 30', 'Travail', 'Soumah', 'Tentative de conciliation', 20, 2500000, 0, 'ouvert', ''],
    ['Statuts de la boutique', 'Hawa Touré', '+224 628 10 20 30', "Création d'entreprise", 'Soumah', 'Signature des statuts', 1, 1500000, 750000, 'ouvert', ''],
    ["Recouvrement d'une facture", 'Société Kankan Distribution', '+224 626 10 20 30', 'Recouvrement', 'Diallo', '', null, 1000000, 1000000, 'clos', "Somme récupérée à l'amiable."],
  ];
  let n = 0;
  for (const [titre, cnom, ctel, domaine, resp, etape, jours, hon, paye, statut, notes] of dossiers) {
    n += 1;
    await sequelize.query(
      `INSERT INTO juridique_dossiers (tenant_code, reference, titre, client_nom, client_telephone, domaine, responsable_id, prochaine_etape, date_echeance, honoraires, montant_paye, statut, notes)
       VALUES (:code, :ref, :titre, :cnom, :ctel, :domaine, :resp, :etape,
               CASE WHEN CAST(:jours AS INTEGER) IS NULL THEN NULL ELSE CURRENT_DATE + CAST(:jours AS INTEGER) END,
               :hon, :paye, :statut, :notes)`,
      { replacements: { code, ref: `D-${new Date().getFullYear()}-${String(n).padStart(4, '0')}`, titre, cnom, ctel, domaine, resp: avocat(resp),
          etape, jours, hon, paye, statut, notes } }
    );
  }
}

// Employés autorisés par le propriétaire (voir utils/accesEmployes.js)
const verifyTenant = avecAccesEmployes(verifyTenantProprietaire);

async function verifyTenantProprietaire(req, res, next) {
  const { tenantCode } = req.params;
  const role = req.user?.role || '';
  const isAdminUser = !!(req.user?.isMasterAdmin || role === 'admin' || role === 'super-admin');
  try {
    await preparerTablesJuridique();
    if (isAdminUser) {
      const [tenant] = await sequelize.query(
        `SELECT * FROM management_tenants WHERE tenant_code=:code LIMIT 1`,
        { replacements: { code: tenantCode }, type: sequelize.QueryTypes.SELECT }
      );
      req.tenant = tenant || { tenant_code: tenantCode, name: 'Juridique Admin', type: 'lawyer', owner_numero_h: 'ADMIN-G7', is_active: true };
      return next();
    }
    const [tenant] = await sequelize.query(
      `SELECT * FROM management_tenants WHERE tenant_code=:code AND owner_numero_h=:n LIMIT 1`,
      { replacements: { code: tenantCode, n: req.userId }, type: sequelize.QueryTypes.SELECT }
    );
    if (!tenant) return res.status(403).json({ success: false, message: 'Accès refusé à ce cabinet.' });
    req.tenant = tenant;
    return enforceGestionAccess(req, res, next);
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}

const select = (sql, replacements) => sequelize.query(sql, { replacements, type: sequelize.QueryTypes.SELECT });

// ─── INFO ─────────────────────────────────────────────────────────────────────
router.get('/:tenantCode/info', authenticate, verifyTenant, (req, res) => {
  res.json({ success: true, tenant: req.tenant });
});

// ─── PARAMÈTRES (nom, logo, contact, horaires, urgence) ────────────────────────
ajouterRouteParametres(router, [authenticate, verifyTenant]);

// ─── TABLEAU DE BORD ──────────────────────────────────────────────────────────
router.get('/:tenantCode/dashboard', authenticate, verifyTenant, async (req, res) => {
  try {
    const code = req.params.tenantCode;
    const un = (sql) => select(sql, { code }).then(r => +(r[0]?.c || 0));
    const [services, staff, today, pending, clients, dossiersOuverts, echeances, recent] = await Promise.all([
      un(`SELECT COUNT(*) as c FROM juridique_services WHERE tenant_code=:code AND is_active=true`),
      un(`SELECT COUNT(*) as c FROM juridique_staff WHERE tenant_code=:code AND is_active=true`),
      un(`SELECT COUNT(*) as c FROM juridique_bookings WHERE tenant_code=:code AND date_rdv=CURRENT_DATE AND statut <> 'annule'`),
      un(`SELECT COUNT(*) as c FROM juridique_bookings WHERE tenant_code=:code AND statut='en_attente'`),
      un(`SELECT COUNT(*) as c FROM juridique_clients WHERE tenant_code=:code AND is_active=true`),
      un(`SELECT COUNT(*) as c FROM juridique_dossiers WHERE tenant_code=:code AND statut IN ('ouvert','en_cours')`),
      un(`SELECT COUNT(*) as c FROM juridique_dossiers WHERE tenant_code=:code AND statut IN ('ouvert','en_cours') AND date_echeance BETWEEN CURRENT_DATE AND CURRENT_DATE + 7`),
      select(`SELECT jb.*, js.nom as service_nom FROM juridique_bookings jb LEFT JOIN juridique_services js ON jb.service_id=js.id AND js.tenant_code=jb.tenant_code WHERE jb.tenant_code=:code ORDER BY jb.date_rdv DESC LIMIT 5`, { code }),
    ]);
    res.json({ success: true, totalServices: services, totalStaff: staff, rdvAujourdhui: today, rdvEnAttente: pending, totalClients: clients, dossiersOuverts, echeancesSemaine: echeances, recentBookings: recent });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── PRESTATIONS (affichées sur le site) ──────────────────────────────────────
router.get('/:tenantCode/services', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await select(`SELECT * FROM juridique_services WHERE tenant_code=:code AND is_active=true ORDER BY categorie, nom`, { code: req.params.tenantCode });
    res.json({ success: true, services: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/services', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, categorie, prix, duree_min, description } = req.body;
    if (!nom) return res.status(400).json({ success: false, message: 'Nom de la prestation requis.' });
    const [row] = await select(
      `INSERT INTO juridique_services (tenant_code,nom,categorie,prix,duree_min,description) VALUES (:code,:nom,:cat,:prix,:duree,:desc) RETURNING *`,
      { code: req.params.tenantCode, nom, cat: categorie || 'Conseil', prix: +(prix || 0), duree: +(duree_min || 60), desc: description || '' }
    );
    res.json({ success: true, service: row });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/services/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`UPDATE juridique_services SET is_active=false WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── ÉQUIPE ───────────────────────────────────────────────────────────────────
router.get('/:tenantCode/staff', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await select(`SELECT * FROM juridique_staff WHERE tenant_code=:code AND is_active=true ORDER BY nom`, { code: req.params.tenantCode });
    res.json({ success: true, staff: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/staff', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, prenom, poste, telephone, specialite, salaire } = req.body;
    if (!nom) return res.status(400).json({ success: false, message: 'Nom requis.' });
    const [row] = await select(
      `INSERT INTO juridique_staff (tenant_code,nom,prenom,poste,telephone,specialite,salaire) VALUES (:code,:nom,:prenom,:poste,:tel,:spec,:sal) RETURNING *`,
      { code: req.params.tenantCode, nom, prenom: prenom || '', poste: poste || 'Avocat', tel: telephone || '', spec: specialite || '', sal: +(salaire || 0) }
    );
    res.json({ success: true, staff: row });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/staff/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`UPDATE juridique_staff SET is_active=false WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── RENDEZ-VOUS ──────────────────────────────────────────────────────────────
router.get('/:tenantCode/bookings', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await select(
      `SELECT jb.*, js.nom as service_nom, js.prix as service_prix, st.nom as staff_nom FROM juridique_bookings jb LEFT JOIN juridique_services js ON jb.service_id=js.id AND js.tenant_code=jb.tenant_code LEFT JOIN juridique_staff st ON jb.staff_id=st.id AND st.tenant_code=jb.tenant_code WHERE jb.tenant_code=:code ORDER BY jb.date_rdv DESC LIMIT 200`,
      { code: req.params.tenantCode }
    );
    res.json({ success: true, bookings: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/bookings', authenticate, verifyTenant, async (req, res) => {
  try {
    const { client_nom, client_telephone, service_id, staff_id, date_rdv, heure_rdv, notes } = req.body;
    if (!client_nom || !date_rdv) return res.status(400).json({ success: false, message: 'Nom du client et date requis.' });
    const [row] = await select(
      `INSERT INTO juridique_bookings (tenant_code,client_nom,client_telephone,service_id,staff_id,date_rdv,heure_rdv,notes) VALUES (:code,:cnom,:ctel,:sid,:stid,:date,:heure,:notes) RETURNING *`,
      { code: req.params.tenantCode, cnom: client_nom, ctel: client_telephone || '', sid: service_id || null, stid: staff_id || null, date: date_rdv, heure: heure_rdv || '', notes: notes || '' }
    );
    res.json({ success: true, booking: row });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

const STATUTS_RDV = ['en_attente', 'confirme', 'termine', 'annule'];
router.patch('/:tenantCode/bookings/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    const { statut } = req.body;
    if (!STATUTS_RDV.includes(statut)) return res.status(400).json({ success: false, message: 'Statut invalide.' });
    await sequelize.query(`UPDATE juridique_bookings SET statut=:statut WHERE id=:id AND tenant_code=:code`, { replacements: { statut, id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── CLIENTS ──────────────────────────────────────────────────────────────────
router.get('/:tenantCode/clients', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await select(`SELECT * FROM juridique_clients WHERE tenant_code=:code AND is_active=true ORDER BY nom`, { code: req.params.tenantCode });
    res.json({ success: true, clients: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/clients', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, telephone, email, notes } = req.body;
    if (!nom) return res.status(400).json({ success: false, message: 'Nom requis.' });
    const [row] = await select(
      `INSERT INTO juridique_clients (tenant_code,nom,telephone,email,notes) VALUES (:code,:nom,:tel,:email,:notes) ON CONFLICT (tenant_code,nom) DO UPDATE SET telephone=COALESCE(NULLIF(EXCLUDED.telephone,''),juridique_clients.telephone),email=COALESCE(NULLIF(EXCLUDED.email,''),juridique_clients.email),notes=COALESCE(NULLIF(EXCLUDED.notes,''),juridique_clients.notes),is_active=true RETURNING *`,
      { code: req.params.tenantCode, nom, tel: telephone || '', email: email || '', notes: notes || '' }
    );
    res.json({ success: true, client: row });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── DOSSIERS (confidentiels : jamais sur le site) ────────────────────────────
router.get('/:tenantCode/dossiers', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await select(
      `SELECT d.*, st.nom AS responsable_nom, st.prenom AS responsable_prenom FROM juridique_dossiers d LEFT JOIN juridique_staff st ON d.responsable_id=st.id AND st.tenant_code=d.tenant_code WHERE d.tenant_code=:code ORDER BY (d.statut='clos'), d.date_echeance NULLS LAST, d.created_at DESC LIMIT 500`,
      { code: req.params.tenantCode }
    );
    res.json({ success: true, dossiers: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/dossiers', authenticate, verifyTenant, async (req, res) => {
  try {
    const { titre, client_nom, client_telephone, domaine, responsable_id, prochaine_etape, date_echeance, honoraires, notes } = req.body;
    if (!titre) return res.status(400).json({ success: false, message: 'Intitulé du dossier requis.' });
    const code = req.params.tenantCode;
    const [{ n }] = await select(`SELECT COUNT(*)::int + 1 AS n FROM juridique_dossiers WHERE tenant_code=:code`, { code });
    const reference = `D-${new Date().getFullYear()}-${String(n).padStart(4, '0')}`;
    const [row] = await select(
      `INSERT INTO juridique_dossiers (tenant_code,reference,titre,client_nom,client_telephone,domaine,responsable_id,prochaine_etape,date_echeance,honoraires,notes)
       VALUES (:code,:ref,:titre,:cnom,:ctel,:dom,:resp,:etape,:ech,:hon,:notes) RETURNING *`,
      { code, ref: reference, titre, cnom: client_nom || '', ctel: client_telephone || '', dom: domaine || '', resp: responsable_id || null,
        etape: prochaine_etape || '', ech: date_echeance || null, hon: +(honoraires || 0), notes: notes || '' }
    );
    res.json({ success: true, dossier: row });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

const STATUTS_DOSSIER = ['ouvert', 'en_cours', 'clos'];
router.patch('/:tenantCode/dossiers/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    const { statut, prochaine_etape, date_echeance, montant_paye } = req.body;
    if (statut !== undefined && !STATUTS_DOSSIER.includes(statut)) return res.status(400).json({ success: false, message: 'Statut invalide.' });
    const [rows] = await sequelize.query(
      `UPDATE juridique_dossiers SET
         statut=COALESCE(:statut,statut),
         prochaine_etape=COALESCE(:etape,prochaine_etape),
         date_echeance=CASE WHEN :changeEch THEN CAST(:ech AS DATE) ELSE date_echeance END,
         montant_paye=COALESCE(:paye,montant_paye),
         updated_at=NOW()
       WHERE id=:id AND tenant_code=:code RETURNING id`,
      { replacements: { statut: statut ?? null, etape: prochaine_etape ?? null, changeEch: date_echeance !== undefined, ech: date_echeance || null,
          paye: montant_paye !== undefined && montant_paye !== '' ? +montant_paye : null, id: req.params.id, code: req.params.tenantCode } }
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Dossier introuvable.' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── ANNONCES (affichées sur le site) ─────────────────────────────────────────
router.get('/:tenantCode/announcements', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await select(`SELECT * FROM juridique_announcements WHERE tenant_code=:code ORDER BY created_at DESC LIMIT 30`, { code: req.params.tenantCode });
    res.json({ success: true, announcements: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/announcements', authenticate, verifyTenant, async (req, res) => {
  try {
    const { titre, contenu, type } = req.body;
    if (!titre || !contenu) return res.status(400).json({ success: false, message: 'Titre et contenu requis.' });
    const [row] = await select(
      `INSERT INTO juridique_announcements (tenant_code,titre,contenu,type) VALUES (:code,:titre,:contenu,:type) RETURNING *`,
      { code: req.params.tenantCode, titre, contenu, type: type || 'general' }
    );
    res.json({ success: true, announcement: row });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/announcements/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`DELETE FROM juridique_announcements WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Rapport du mois (honoraires encaissés) ──
ajouterRouteRapport(router, [authenticate, verifyTenant], {
  recettes: [
    { label: 'Consultations terminées', table: 'juridique_bookings jb JOIN juridique_services js ON jb.service_id=js.id AND js.tenant_code=jb.tenant_code', alias: 'jb', montant: 'js.prix', date: 'jb.date_rdv', where: "jb.statut = 'termine'" },
    { label: 'Honoraires des dossiers', table: 'juridique_dossiers', montant: 'montant_paye', date: 'updated_at', where: 'montant_paye > 0' },
  ],
});

// ── Accès des employés (géré par le propriétaire uniquement) ──
ajouterRoutesAccesEmployes(router, [authenticate, verifyTenantProprietaire]);

export default router;
