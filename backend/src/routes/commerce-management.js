import express from 'express';
import { syncAccountFromTenant } from '../utils/tenantSync.js';
import { authenticate } from '../middleware/auth.js';
import { sequelize } from '../config/database.js';
import { enforceGestionAccess } from '../middleware/gestionAccessGuard.js';
import { ensureTenantExtraColumns } from './clinic-management.js';
import { ajouterRouteRapport } from '../utils/routeRapport.js';
import { avecAccesEmployes, ajouterRoutesAccesEmployes } from '../utils/accesEmployes.js';

const router = express.Router();

// Employés autorisés par le propriétaire (voir utils/accesEmployes.js)
const verifyTenant = avecAccesEmployes(verifyTenantProprietaire);

export async function ensureStaffTable() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS commerce_staff (
      id           SERIAL PRIMARY KEY,
      tenant_code  VARCHAR(50) NOT NULL,
      nom          VARCHAR(255) NOT NULL,
      telephone    VARCHAR(50),
      role         VARCHAR(50) DEFAULT 'Caissier',
      numero_h     VARCHAR(50),
      photo_url    TEXT,
      is_active    BOOLEAN DEFAULT true,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

// Vérifie que le tenant appartient à l'utilisateur connecté (propriétaire, membre du
// personnel relié à son compte Moftal, ou admin plateforme). req.myRole indique le
// rôle utilisé côté frontend pour limiter les sections visibles (droits par rôle).
async function verifyTenantProprietaire(req, res, next) {
  const { tenantCode } = req.params;
  const role = req.user?.role || '';
  const isAdminUser = !!(req.user?.isMasterAdmin || role === 'admin' || role === 'super-admin');
  try {
    if (isAdminUser) {
      const [tenant] = await sequelize.query(`SELECT * FROM management_tenants WHERE tenant_code=:code LIMIT 1`, { replacements: { code: tenantCode }, type: sequelize.QueryTypes.SELECT });
      req.tenant = tenant || { tenant_code: tenantCode, name: 'Commerce Admin', type: 'commerce', owner_numero_h: 'ADMIN-G7', is_active: true };
      req.myRole = 'Propriétaire';
      req.estProprietaire = true;
      return next();
    }
    const [tenant] = await sequelize.query(`SELECT * FROM management_tenants WHERE tenant_code=:code AND owner_numero_h=:n LIMIT 1`, { replacements: { code: tenantCode, n: req.userId }, type: sequelize.QueryTypes.SELECT });
    if (tenant) {
      req.tenant = tenant;
      req.myRole = 'Propriétaire';
      req.estProprietaire = true;
      return enforceGestionAccess(req, res, next);
    }
    // Pas le propriétaire : vérifier si connecté en tant que membre du personnel
    await ensureStaffTable();
    const [staffMember] = await sequelize.query(
      `SELECT s.*, t.* FROM commerce_staff s JOIN management_tenants t ON t.tenant_code = s.tenant_code
       WHERE s.tenant_code = :code AND s.numero_h = :n AND s.is_active = true LIMIT 1`,
      { replacements: { code: tenantCode, n: req.userId }, type: sequelize.QueryTypes.SELECT }
    );
    if (!staffMember) return res.status(403).json({ success: false, message: 'Accès refusé à cet espace commerce.' });
    req.tenant = staffMember;
    req.myRole = staffMember.role || 'Caissier';
    return enforceGestionAccess(req, res, next);
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}

// Rôles du personnel, vérifiés par le serveur (pas seulement par l'écran) :
// le Caissier vend, encaisse et gère produits et clients, mais ne touche ni aux
// paramètres, ni au personnel, ni aux dépenses, fournisseurs, achats et avis.
function pasCaissier(req, res, next) {
  if (String(req.myRole || '') === 'Caissier') {
    return res.status(403).json({ success: false, message: "Votre rôle (Caissier) ne permet pas cette action. Demandez au gérant ou au propriétaire." });
  }
  next();
}

// ─── EXTRAS (traçabilité stock, annulation de vente) ───────────────────────────
export async function ensureCommerceExtras() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS commerce_stock_movements (
      id           SERIAL PRIMARY KEY,
      tenant_code  VARCHAR(50) NOT NULL,
      product_id   INTEGER NOT NULL,
      delta        INTEGER NOT NULL,
      reason       VARCHAR(100) NOT NULL,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await sequelize.query(`ALTER TABLE commerce_sales ADD COLUMN IF NOT EXISTS annulee BOOLEAN DEFAULT false;`);
  await sequelize.query(`ALTER TABLE commerce_sales ADD COLUMN IF NOT EXISTS remise DECIMAL(15,0) DEFAULT 0;`);
  await sequelize.query(`ALTER TABLE commerce_products ADD COLUMN IF NOT EXISTS code_barre VARCHAR(100);`);
  await sequelize.query(`ALTER TABLE commerce_products ADD COLUMN IF NOT EXISTS photo_url TEXT;`);
  // Remboursements de crédit : l'argent encaissé est enregistré (rapport du mois)
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS commerce_credit_payments (
      id           SERIAL PRIMARY KEY,
      tenant_code  VARCHAR(50) NOT NULL,
      client_id    INTEGER NOT NULL,
      montant      DECIMAL(15,0) NOT NULL DEFAULT 0,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

// ─── FOURNISSEURS & ACHATS ──────────────────────────────────────────────────────
async function ensureSuppliersTables() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS commerce_suppliers (
      id           SERIAL PRIMARY KEY,
      tenant_code  VARCHAR(50) NOT NULL,
      nom          VARCHAR(255) NOT NULL,
      telephone    VARCHAR(50),
      adresse      TEXT,
      is_active    BOOLEAN DEFAULT true,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS commerce_purchases (
      id            SERIAL PRIMARY KEY,
      tenant_code   VARCHAR(50) NOT NULL,
      supplier_id   INTEGER,
      product_id    INTEGER NOT NULL,
      quantite      INTEGER NOT NULL DEFAULT 1,
      prix_unitaire DECIMAL(15,0) NOT NULL DEFAULT 0,
      total         DECIMAL(15,0) NOT NULL DEFAULT 0,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

// Avec une transaction, une erreur fait tout annuler (rien de perdu en silence).
async function logStockMovement(code, productId, delta, reason, transaction) {
  if (!delta) return;
  const q = sequelize.query(
    `INSERT INTO commerce_stock_movements (tenant_code, product_id, delta, reason) VALUES (:code,:pid,:delta,:reason)`,
    { replacements: { code, pid: productId, delta, reason }, transaction }
  );
  if (transaction) await q; else await q.catch(() => {});
}

// ─── INFO ─────────────────────────────────────────────────────────────────────
router.get('/:tenantCode/info', authenticate, verifyTenant, (req, res) => {
  res.json({ success: true, tenant: req.tenant, myRole: req.myRole });
});

// ─── PERSONNEL / VENDEURS ───────────────────────────────────────────────────────
router.get('/:tenantCode/staff', authenticate, verifyTenant, async (req, res) => {
  try {
    await ensureStaffTable();
    const rows = await sequelize.query(`SELECT * FROM commerce_staff WHERE tenant_code=:code AND is_active=true ORDER BY nom`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, staff: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/staff', authenticate, verifyTenant, pasCaissier, async (req, res) => {
  try {
    await ensureStaffTable();
    const { nom, telephone, role, numero_h, photo_url } = req.body;
    if (['Propriétaire', 'Gérant'].includes(role) && !req.estProprietaire) {
      return res.status(403).json({ success: false, message: 'Seul le propriétaire peut nommer un gérant ou un propriétaire.' });
    }
    const [rows] = await sequelize.query(
      `INSERT INTO commerce_staff (tenant_code,nom,telephone,role,numero_h,photo_url) VALUES(:code,:nom,:tel,:role,:nh,:photo) RETURNING *`,
      { replacements: { code: req.params.tenantCode, nom, tel: telephone || null, role: role || 'Caissier', nh: numero_h || null, photo: photo_url || null }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true, member: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:tenantCode/staff/:id', authenticate, verifyTenant, pasCaissier, async (req, res) => {
  try {
    const { nom, telephone, role, numero_h, photo_url } = req.body;
    if (['Propriétaire', 'Gérant'].includes(role) && !req.estProprietaire) {
      return res.status(403).json({ success: false, message: 'Seul le propriétaire peut nommer un gérant ou un propriétaire.' });
    }
    await sequelize.query(
      `UPDATE commerce_staff SET nom=:nom,telephone=:tel,role=:role,numero_h=:nh,photo_url=:photo WHERE id=:id AND tenant_code=:code`,
      { replacements: { nom, tel: telephone || null, role: role || 'Caissier', nh: numero_h || null, photo: photo_url || null, id: req.params.id, code: req.params.tenantCode } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/staff/:id', authenticate, verifyTenant, pasCaissier, async (req, res) => {
  try {
    await sequelize.query(`UPDATE commerce_staff SET is_active=false WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── AVIS CLIENTS ────────────────────────────────────────────────────────────────
export async function ensureCommerceReviewsTable() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS commerce_reviews (
      id           SERIAL PRIMARY KEY,
      tenant_code  VARCHAR(50) NOT NULL,
      nom_auteur   VARCHAR(255),
      note         INTEGER NOT NULL,
      commentaire  TEXT,
      statut       VARCHAR(20) DEFAULT 'en_attente',
      created_at   TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

router.get('/:tenantCode/reviews', authenticate, verifyTenant, async (req, res) => {
  try {
    await ensureCommerceReviewsTable();
    const rows = await sequelize.query(`SELECT * FROM commerce_reviews WHERE tenant_code=:code ORDER BY created_at DESC`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, reviews: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:tenantCode/reviews/:id', authenticate, verifyTenant, pasCaissier, async (req, res) => {
  try {
    const { statut } = req.body;
    await sequelize.query(`UPDATE commerce_reviews SET statut=:statut WHERE id=:id AND tenant_code=:code`, { replacements: { statut, id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/reviews/:id', authenticate, verifyTenant, pasCaissier, async (req, res) => {
  try {
    await sequelize.query(`DELETE FROM commerce_reviews WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── PARAMÈTRES (nom, logo, contact, horaires, urgence) ────────────────────────
router.put('/:tenantCode/settings', authenticate, verifyTenant, pasCaissier, async (req, res) => {
  try {
    await ensureTenantExtraColumns();
    const { name, logo_url, address, phone, email, description, horaires, phone_urgence } = req.body;
    const code = req.params.tenantCode;
    await sequelize.query(
      `UPDATE management_tenants SET
        name          = COALESCE(:name, name),
        logo_url      = COALESCE(NULLIF(:logo, ''), logo_url),
        address       = :address,
        phone         = :phone,
        email         = :email,
        description   = :desc,
        horaires      = :horaires,
        phone_urgence = :phone_urgence
       WHERE tenant_code = :code`,
      { replacements: { name: name || null, hasLogo: logo_url !== undefined, logo: logo_url || null, address: address || null, phone: phone || null, email: email || null, desc: description || null, horaires: horaires || null, phone_urgence: phone_urgence || null, code } }
    );
    const [updated] = await sequelize.query(`SELECT * FROM management_tenants WHERE tenant_code = :code LIMIT 1`, { replacements: { code }, type: sequelize.QueryTypes.SELECT });
    await syncAccountFromTenant(req.params.tenantCode);
    res.json({ success: true, tenant: updated });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
router.get('/:tenantCode/dashboard', authenticate, verifyTenant, async (req, res) => {
  try {
    await ensureCommerceExtras();
    const code = req.params.tenantCode;
    const q = (sql, rep) => sequelize.query(sql, { replacements: rep, type: sequelize.QueryTypes.SELECT }).then(r => r[0]).catch(() => ({ c: 0, t: 0 }));
    const [prod, stock, sales, month, cred, clients, depenses, recent, lowStock] = await Promise.all([
      q(`SELECT COUNT(*) as c FROM commerce_products WHERE tenant_code=:code AND is_active=true`, { code }),
      q(`SELECT COUNT(*) as c FROM commerce_products WHERE tenant_code=:code AND is_active=true AND stock<=stock_min`, { code }),
      q(`SELECT COUNT(*) as c, COALESCE(SUM(total),0) as t FROM commerce_sales WHERE tenant_code=:code AND DATE(date_vente)=CURRENT_DATE AND annulee IS NOT TRUE`, { code }),
      q(`SELECT COALESCE(SUM(total),0) as t FROM commerce_sales WHERE tenant_code=:code AND date_vente >= date_trunc('month', CURRENT_DATE) AND date_vente < date_trunc('month', CURRENT_DATE) + interval '1 month' AND annulee IS NOT TRUE`, { code }),
      q(`SELECT COALESCE(SUM(credit_total),0) as t FROM commerce_clients WHERE tenant_code=:code AND is_active=true`, { code }),
      q(`SELECT COUNT(*) as c FROM commerce_clients WHERE tenant_code=:code AND is_active=true`, { code }),
      q(`SELECT COALESCE(SUM(montant),0) as t FROM commerce_expenses WHERE tenant_code=:code AND DATE(date_depense)=CURRENT_DATE`, { code }),
      sequelize.query(`SELECT * FROM commerce_sales WHERE tenant_code=:code AND annulee IS NOT TRUE ORDER BY date_vente DESC LIMIT 5`, { replacements: { code }, type: sequelize.QueryTypes.SELECT }).catch(() => []),
      sequelize.query(`SELECT * FROM commerce_products WHERE tenant_code=:code AND is_active=true AND stock<=stock_min ORDER BY stock ASC LIMIT 5`, { replacements: { code }, type: sequelize.QueryTypes.SELECT }).catch(() => []),
    ]);
    res.json({
      success: true,
      totalProducts: +(prod.c||0),
      alertesStock: +(stock.c||0),
      ventesAujourdhui: +(sales.c||0),
      caAujourdhui: +(sales.t||0),
      caMois: +(month.t||0),
      totalCredits: +(cred.t||0),
      totalClients: +(clients.c||0),
      depensesAujourdhui: +(depenses.t||0),
      recentSales: recent,
      lowStockProducts: lowStock
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── PRODUITS ─────────────────────────────────────────────────────────────────
router.get('/:tenantCode/products', authenticate, verifyTenant, async (req, res) => {
  try {
    await ensureCommerceExtras();
    const { search } = req.query;
    let q = `SELECT * FROM commerce_products WHERE tenant_code=:code AND is_active=true`;
    if (search) q += ` AND (nom ILIKE :s OR categorie ILIKE :s OR code_barre = :exact)`;
    q += ` ORDER BY nom`;
    const rows = await sequelize.query(q, { replacements: { code: req.params.tenantCode, s: `%${search || ''}%`, exact: search || '' }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, products: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/products', authenticate, verifyTenant, async (req, res) => {
  try {
    await ensureCommerceExtras();
    const { nom, categorie, prix_vente, prix_achat, stock, stock_min, unite, code_barre, photo_url } = req.body;
    const code = req.params.tenantCode;
    const [rows] = await sequelize.query(
      `INSERT INTO commerce_products (tenant_code,nom,categorie,prix_vente,prix_achat,stock,stock_min,unite,code_barre,photo_url) VALUES(:code,:nom,:cat,:pv,:pa,:stk,:smin,:u,:cb,:photo) RETURNING *`,
      { replacements: { code, nom, cat: categorie || null, pv: prix_vente || 0, pa: prix_achat || 0, stk: stock || 0, smin: stock_min || 5, u: unite || 'pièce', cb: code_barre || null, photo: photo_url || null }, type: sequelize.QueryTypes.INSERT }
    );
    if (stock) await logStockMovement(code, rows[0].id, +stock, 'creation');
    res.json({ success: true, product: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/products/import', authenticate, verifyTenant, async (req, res) => {
  try {
    await ensureCommerceExtras();
    const { products } = req.body;
    const code = req.params.tenantCode;
    let count = 0;
    for (const p of products || []) {
      if (!p.nom) continue;
      await sequelize.query(
        `INSERT INTO commerce_products (tenant_code,nom,categorie,prix_vente,prix_achat,stock,stock_min,unite) VALUES(:code,:nom,:cat,:pv,:pa,:stk,:smin,:u)`,
        { replacements: { code, nom: p.nom, cat: p.categorie || null, pv: +p.prix_vente || 0, pa: +p.prix_achat || 0, stk: +p.stock || 0, smin: +p.stock_min || 5, u: p.unite || 'pièce' } }
      );
      count++;
    }
    res.json({ success: true, count });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:tenantCode/products/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await ensureCommerceExtras();
    const { nom, categorie, prix_vente, prix_achat, stock, stock_min, unite, code_barre, photo_url } = req.body;
    const code = req.params.tenantCode;
    const [before] = await sequelize.query(`SELECT stock FROM commerce_products WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code }, type: sequelize.QueryTypes.SELECT });
    await sequelize.query(
      `UPDATE commerce_products SET nom=:nom,categorie=:cat,prix_vente=:pv,prix_achat=:pa,stock=:stk,stock_min=:smin,unite=:u,code_barre=:cb,photo_url=:photo WHERE id=:id AND tenant_code=:code`,
      { replacements: { nom, cat: categorie, pv: prix_vente, pa: prix_achat, stk: stock, smin: stock_min, u: unite, cb: code_barre || null, photo: photo_url || null, id: req.params.id, code } }
    );
    const delta = (+stock || 0) - (+(before?.stock) || 0);
    if (delta) await logStockMovement(code, req.params.id, delta, 'modification');
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:tenantCode/products/:id/stock', authenticate, verifyTenant, async (req, res) => {
  try {
    await ensureCommerceExtras();
    const { delta } = req.body;
    const code = req.params.tenantCode;
    await sequelize.query(
      `UPDATE commerce_products SET stock=GREATEST(0,stock+:delta) WHERE id=:id AND tenant_code=:code`,
      { replacements: { delta: delta || 0, id: req.params.id, code } }
    );
    await logStockMovement(code, req.params.id, delta || 0, 'ajustement_manuel');
    const [prod] = await sequelize.query(`SELECT stock FROM commerce_products WHERE id=:id`, { replacements: { id: req.params.id }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, newStock: prod?.stock });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/products/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`UPDATE commerce_products SET is_active=false WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/:tenantCode/products/:id/movements', authenticate, verifyTenant, async (req, res) => {
  try {
    await ensureCommerceExtras();
    const rows = await sequelize.query(
      `SELECT * FROM commerce_stock_movements WHERE tenant_code=:code AND product_id=:id ORDER BY created_at DESC LIMIT 100`,
      { replacements: { code: req.params.tenantCode, id: req.params.id }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, movements: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── VENTES ───────────────────────────────────────────────────────────────────
router.get('/:tenantCode/sales', authenticate, verifyTenant, async (req, res) => {
  try {
    await ensureCommerceExtras();
    const rows = await sequelize.query(`SELECT * FROM commerce_sales WHERE tenant_code=:code ORDER BY date_vente DESC LIMIT 100`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, sales: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/sales', authenticate, verifyTenant, async (req, res) => {
  try {
    await ensureCommerceExtras();
    const { client_nom, items, type_paiement, montant_recu, est_credit, notes, remise } = req.body;
    const code = req.params.tenantCode;
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ success: false, message: 'Ajoutez au moins un article.' });
    if (est_credit && !String(client_nom || '').trim()) return res.status(400).json({ success: false, message: 'Nom du client obligatoire pour une vente à crédit.' });
    const brut = (items || []).reduce((s, i) => s + (+i.prix_unitaire || 0) * (+i.quantite || 1), 0);
    const total = Math.max(0, brut - (+remise || 0));
    // Argent reçu : ce qui est saisi ; sinon tout (vente comptant) ou rien (crédit)
    const recu = montant_recu !== undefined && montant_recu !== null && montant_recu !== '' ? Math.max(0, +montant_recu || 0) : (est_credit ? 0 : total);
    // Vente, stock et crédit client : tout est enregistré ensemble, ou rien
    const sale = await sequelize.transaction(async (t) => {
      const [rows] = await sequelize.query(
        `INSERT INTO commerce_sales (tenant_code,client_nom,total,montant_recu,type_paiement,est_credit,notes,items,remise) VALUES(:code,:nom,:total,:recu,:type,:credit,:notes,:items::jsonb,:remise) RETURNING *`,
        { replacements: { code, nom: String(client_nom || '').trim() || 'Client', total, recu, type: type_paiement || 'especes', credit: !!est_credit, notes: notes || null, items: JSON.stringify(items || []), remise: remise || 0 }, type: sequelize.QueryTypes.INSERT, transaction: t }
      );
      // Déduire le stock pour chaque produit
      for (const item of items) {
        if (item.product_id) {
          await sequelize.query(
            `UPDATE commerce_products SET stock=GREATEST(0,stock-:qty) WHERE id=:id AND tenant_code=:code`,
            { replacements: { qty: item.quantite || 1, id: item.product_id, code }, transaction: t }
          );
          await logStockMovement(code, item.product_id, -(item.quantite || 1), 'vente', t);
        }
      }
      // Vente à crédit : la dette (total - reçu) s'ajoute à la fiche du client,
      // créée une seule fois (avant : une nouvelle fiche à chaque vente)
      if (est_credit) {
        const nomClient = String(client_nom).trim();
        const dette = Math.max(0, total - recu);
        const [existant] = await sequelize.query(
          `SELECT id FROM commerce_clients WHERE tenant_code=:code AND LOWER(TRIM(nom))=LOWER(:nom) ORDER BY id LIMIT 1`,
          { replacements: { code, nom: nomClient }, type: sequelize.QueryTypes.SELECT, transaction: t }
        );
        if (existant) {
          await sequelize.query(`UPDATE commerce_clients SET credit_total=COALESCE(credit_total,0)+:dette WHERE id=:id`, { replacements: { dette, id: existant.id }, transaction: t });
        } else {
          await sequelize.query(`INSERT INTO commerce_clients (tenant_code,nom,credit_total) VALUES(:code,:nom,:dette)`, { replacements: { code, nom: nomClient, dette }, transaction: t });
        }
      }
      return rows[0];
    });
    res.json({ success: true, sale });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/sales/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await ensureCommerceExtras();
    const code = req.params.tenantCode;
    // On marque d'abord la vente annulée : seule la requête qui réussit ce
    // passage remet le stock et le crédit (un double clic ne compte pas deux fois).
    const resultat = await sequelize.transaction(async (t) => {
      const [annulees] = await sequelize.query(
        `UPDATE commerce_sales SET annulee=true WHERE id=:id AND tenant_code=:code AND annulee IS NOT TRUE RETURNING *`,
        { replacements: { id: req.params.id, code }, transaction: t }
      );
      const sale = annulees?.[0];
      if (!sale) {
        const [existe] = await sequelize.query(`SELECT id FROM commerce_sales WHERE id=:id AND tenant_code=:code LIMIT 1`, { replacements: { id: req.params.id, code }, type: sequelize.QueryTypes.SELECT, transaction: t });
        return existe ? 'deja' : 'introuvable';
      }
      const items = Array.isArray(sale.items) ? sale.items : [];
      for (const item of items) {
        if (item.product_id) {
          await sequelize.query(
            `UPDATE commerce_products SET stock=stock+:qty WHERE id=:id AND tenant_code=:code`,
            { replacements: { qty: item.quantite || 1, id: item.product_id, code }, transaction: t }
          );
          await logStockMovement(code, item.product_id, +(item.quantite || 1), 'annulation_vente', t);
        }
      }
      if (sale.est_credit && sale.client_nom) {
        const creditPart = Math.max(0, (+sale.total || 0) - (+sale.montant_recu || 0));
        await sequelize.query(
          `UPDATE commerce_clients SET credit_total=GREATEST(0,credit_total-:m)
           WHERE id=(SELECT id FROM commerce_clients WHERE tenant_code=:code AND LOWER(TRIM(nom))=LOWER(TRIM(:nom)) ORDER BY id LIMIT 1)`,
          { replacements: { m: creditPart, code, nom: sale.client_nom }, transaction: t }
        );
      }
      return 'ok';
    });
    if (resultat === 'introuvable') return res.status(404).json({ success: false, message: 'Vente introuvable.' });
    if (resultat === 'deja') return res.status(400).json({ success: false, message: 'Cette vente est déjà annulée.' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── CLIENTS ──────────────────────────────────────────────────────────────────
router.get('/:tenantCode/clients', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(`SELECT * FROM commerce_clients WHERE tenant_code=:code AND is_active=true ORDER BY credit_total DESC,nom`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, clients: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/clients', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, telephone, adresse } = req.body;
    const [rows] = await sequelize.query(
      `INSERT INTO commerce_clients (tenant_code,nom,telephone,adresse) VALUES(:code,:nom,:tel,:adr) RETURNING *`,
      { replacements: { code: req.params.tenantCode, nom, tel: telephone || null, adr: adresse || null }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true, client: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:tenantCode/clients/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, telephone, adresse } = req.body;
    await sequelize.query(
      `UPDATE commerce_clients SET nom=:nom,telephone=:tel,adresse=:adr WHERE id=:id AND tenant_code=:code`,
      { replacements: { nom, tel: telephone || null, adr: adresse || null, id: req.params.id, code: req.params.tenantCode } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/clients/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    const [client] = await sequelize.query(`SELECT credit_total FROM commerce_clients WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    if (client && +client.credit_total > 0) return res.status(400).json({ success: false, message: 'Remboursez le crédit de ce client avant de le supprimer.' });
    await sequelize.query(`UPDATE commerce_clients SET is_active=false WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:tenantCode/clients/:id/pay-credit', authenticate, verifyTenant, async (req, res) => {
  try {
    await ensureCommerceExtras();
    const montant = Math.round(+req.body?.montant || 0);
    if (!(montant > 0)) return res.status(400).json({ success: false, message: 'Le montant encaissé doit être supérieur à 0.' });
    const code = req.params.tenantCode;
    // Baisse du crédit et enregistrement de l'argent reçu : ensemble, ou rien
    const resultat = await sequelize.transaction(async (t) => {
      const [client] = await sequelize.query(
        `SELECT id, credit_total FROM commerce_clients WHERE id=:id AND tenant_code=:code FOR UPDATE`,
        { replacements: { id: req.params.id, code }, type: sequelize.QueryTypes.SELECT, transaction: t }
      );
      if (!client) return { erreur: 404, message: 'Client introuvable.' };
      const encaisse = Math.min(montant, Math.max(0, +client.credit_total || 0));
      if (!(encaisse > 0)) return { erreur: 400, message: "Ce client n'a pas de crédit à rembourser." };
      await sequelize.query(
        `UPDATE commerce_clients SET credit_total=GREATEST(0,credit_total-:m) WHERE id=:id AND tenant_code=:code`,
        { replacements: { m: encaisse, id: client.id, code }, transaction: t }
      );
      await sequelize.query(
        `INSERT INTO commerce_credit_payments (tenant_code, client_id, montant) VALUES (:code,:cid,:m)`,
        { replacements: { code, cid: client.id, m: encaisse }, transaction: t }
      );
      return { encaisse };
    });
    if (resultat.erreur) return res.status(resultat.erreur).json({ success: false, message: resultat.message });
    res.json({ success: true, montant: resultat.encaisse });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── DÉPENSES ─────────────────────────────────────────────────────────────────
router.get('/:tenantCode/expenses', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT * FROM commerce_expenses WHERE tenant_code=:code ORDER BY date_depense DESC LIMIT 200`,
      { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, expenses: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/expenses', authenticate, verifyTenant, pasCaissier, async (req, res) => {
  try {
    const { description, montant, categorie } = req.body;
    const [rows] = await sequelize.query(
      `INSERT INTO commerce_expenses (tenant_code,description,montant,categorie) VALUES(:code,:desc,:montant,:cat) RETURNING *`,
      { replacements: { code: req.params.tenantCode, desc: description, montant: montant || 0, cat: categorie || 'Autre' }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true, expense: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:tenantCode/expenses/:id', authenticate, verifyTenant, pasCaissier, async (req, res) => {
  try {
    const { description, montant, categorie } = req.body;
    await sequelize.query(
      `UPDATE commerce_expenses SET description=:desc,montant=:montant,categorie=:cat WHERE id=:id AND tenant_code=:code`,
      { replacements: { desc: description, montant: montant || 0, cat: categorie || 'Autre', id: req.params.id, code: req.params.tenantCode } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/expenses/:id', authenticate, verifyTenant, pasCaissier, async (req, res) => {
  try {
    await sequelize.query(`DELETE FROM commerce_expenses WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── FOURNISSEURS ─────────────────────────────────────────────────────────────
router.get('/:tenantCode/suppliers', authenticate, verifyTenant, async (req, res) => {
  try {
    await ensureSuppliersTables();
    const rows = await sequelize.query(`SELECT * FROM commerce_suppliers WHERE tenant_code=:code AND is_active=true ORDER BY nom`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, suppliers: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/suppliers', authenticate, verifyTenant, pasCaissier, async (req, res) => {
  try {
    await ensureSuppliersTables();
    const { nom, telephone, adresse } = req.body;
    const [rows] = await sequelize.query(
      `INSERT INTO commerce_suppliers (tenant_code,nom,telephone,adresse) VALUES(:code,:nom,:tel,:adr) RETURNING *`,
      { replacements: { code: req.params.tenantCode, nom, tel: telephone || null, adr: adresse || null }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true, supplier: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/suppliers/:id', authenticate, verifyTenant, pasCaissier, async (req, res) => {
  try {
    await sequelize.query(`UPDATE commerce_suppliers SET is_active=false WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── ACHATS / RÉAPPROVISIONNEMENT ──────────────────────────────────────────────
router.get('/:tenantCode/purchases', authenticate, verifyTenant, async (req, res) => {
  try {
    await ensureSuppliersTables();
    const rows = await sequelize.query(
      `SELECT p.*, pr.nom as product_nom, s.nom as supplier_nom FROM commerce_purchases p
       LEFT JOIN commerce_products pr ON p.product_id = pr.id
       LEFT JOIN commerce_suppliers s ON p.supplier_id = s.id
       WHERE p.tenant_code=:code ORDER BY p.created_at DESC LIMIT 200`,
      { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, purchases: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/purchases', authenticate, verifyTenant, pasCaissier, async (req, res) => {
  try {
    await ensureSuppliersTables();
    await ensureCommerceExtras();
    const { supplier_id, product_id, quantite, prix_unitaire } = req.body;
    const code = req.params.tenantCode;
    if (!product_id || !quantite) return res.status(400).json({ success: false, message: 'Produit et quantité requis.' });
    const total = (+prix_unitaire || 0) * (+quantite || 0);
    const [rows] = await sequelize.query(
      `INSERT INTO commerce_purchases (tenant_code,supplier_id,product_id,quantite,prix_unitaire,total) VALUES(:code,:sup,:pid,:qty,:pu,:total) RETURNING *`,
      { replacements: { code, sup: supplier_id || null, pid: product_id, qty: quantite, pu: prix_unitaire || 0, total }, type: sequelize.QueryTypes.INSERT }
    );
    await sequelize.query(`UPDATE commerce_products SET stock=stock+:qty WHERE id=:id AND tenant_code=:code`, { replacements: { qty: quantite, id: product_id, code } });
    await logStockMovement(code, product_id, +quantite, 'achat_fournisseur');
    res.json({ success: true, purchase: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});


// ── Rapport du mois (recettes, dépenses, bénéfice) ──
ajouterRouteRapport(router, [authenticate, verifyTenant], {
  recettes: [
    { label: 'Ventes encaissées', table: 'commerce_sales', montant: 'montant_recu', date: 'date_vente', where: 'annulee IS NOT TRUE' },
    { label: 'Crédits remboursés', table: 'commerce_credit_payments', montant: 'montant', date: 'created_at' },
  ],
  depenses: [
    { label: 'Dépenses', table: 'commerce_expenses', montant: 'montant', date: 'date_depense' },
    { label: 'Achats fournisseurs', table: 'commerce_purchases', montant: 'total', date: 'created_at' },
  ],
});

// ── Accès des employés (géré par le propriétaire uniquement) ──
ajouterRoutesAccesEmployes(router, [authenticate, verifyTenantProprietaire]);

export default router;
