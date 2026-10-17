import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { sequelize } from '../config/database.js';
import { enforceGestionAccess } from '../middleware/gestionAccessGuard.js';
import { avecAccesEmployes } from '../utils/accesEmployes.js';
import { notifierMembreEtablissement } from '../utils/notificationsEtablissement.js';

// Messages envoyés depuis le site d'un établissement (demande d'information,
// devis, réservation, commande d'une boutique…). Ils arrivent directement dans
// sa gestion (Espace Pro → Messages du site), enregistrés en base, et le
// responsable est prévenu — jamais par une messagerie extérieure.
//   • publicDemandesRouter : envoi par le visiteur (/api/pro-public/demande/:tenantCode)
//   • siteMgmtRouter       : lecture et suivi dans la gestion (/api/site-mgmt/:tenantCode/demandes)

// Type d'établissement → adresse de sa gestion (lien de la notification)
const GESTION_PAR_TYPE = {
  clinic: 'gestion-clinique', health_worker: 'gestion-clinique', school: 'gestion-ecole', madrasa: 'gestion-madrasa',
  mosque: 'gestion-mosquee', imam: 'gestion-imam', reseau: 'gestion-reseau', commerce: 'gestion-commerce',
  enterprise: 'gestion-entreprise', ngo: 'gestion-ngo', journalist: 'gestion-journaliste', scientist: 'gestion-scientifique',
  supplier: 'gestion-fournisseur', security_agency: 'gestion-securite', broker: 'gestion-immobilier',
  restaurant: 'gestion-restaurant', transport: 'gestion-transport', mairie: 'gestion-mairie', vendor: 'gestion-vendeur',
  producer: 'gestion-producer', beauty: 'gestion-beauty', artisan: 'gestion-artisan',
};

let tablePrete = null;
const preparerTable = () => (tablePrete ||= sequelize.query(`
  CREATE TABLE IF NOT EXISTS "site_demandes" (
    "id"          SERIAL PRIMARY KEY,
    "tenant_code" VARCHAR(50)  NOT NULL REFERENCES management_tenants(tenant_code) ON DELETE CASCADE,
    "objet"       VARCHAR(120),
    "nom"         VARCHAR(255) NOT NULL,
    "telephone"   VARCHAR(50)  NOT NULL,
    "email"       VARCHAR(255),
    "message"     TEXT         NOT NULL,
    "statut"      VARCHAR(20)  NOT NULL DEFAULT 'nouveau',
    "created_at"  TIMESTAMPTZ  DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS "idx_site_demandes_tenant" ON "site_demandes" ("tenant_code", "created_at" DESC);
`).catch((e) => { tablePrete = null; throw e; }));

const texte = (v, max) => String(v || '').trim().slice(0, max);

export const publicDemandesRouter = express.Router();

publicDemandesRouter.post('/demande/:tenantCode', async (req, res) => {
  try {
    const code = req.params.tenantCode;
    const nom = texte(req.body?.nom, 255);
    const telephone = texte(req.body?.telephone, 50);
    const email = texte(req.body?.email, 255);
    const message = texte(req.body?.message, 4000);
    const objet = texte(req.body?.objet, 120) || 'Message';
    if (!nom || telephone.replace(/[^0-9]/g, '').length < 8) {
      return res.status(400).json({ success: false, message: 'Votre nom et votre numéro de téléphone sont obligatoires.' });
    }
    if (!message) return res.status(400).json({ success: false, message: 'Écrivez votre message.' });
    const [tenant] = await sequelize.query(
      `SELECT tenant_code, type, owner_numero_h FROM management_tenants WHERE tenant_code = :code AND is_active IS NOT FALSE LIMIT 1`,
      { replacements: { code }, type: sequelize.QueryTypes.SELECT }
    );
    if (!tenant) return res.status(404).json({ success: false, message: 'Établissement introuvable.' });
    await preparerTable();
    const [rows] = await sequelize.query(
      `INSERT INTO site_demandes (tenant_code, objet, nom, telephone, email, message) VALUES (:code, :objet, :nom, :tel, :email, :message) RETURNING id`,
      { replacements: { code: tenant.tenant_code, objet, nom, tel: telephone, email: email || null, message }, type: sequelize.QueryTypes.INSERT }
    );
    if (tenant.owner_numero_h) {
      const gestion = GESTION_PAR_TYPE[tenant.type];
      await notifierMembreEtablissement(tenant.tenant_code, tenant.owner_numero_h, 'demande_site',
        `${objet} — ${nom} (${telephone}) : ${message.slice(0, 200)}`,
        { url: gestion ? `/${gestion}/${tenant.tenant_code}?demandes=1` : '/gestion-interne' });
    }
    res.json({ success: true, demande: { id: rows?.[0]?.id } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export const siteMgmtRouter = express.Router();

async function verifyTenantProprietaire(req, res, next) {
  const { tenantCode } = req.params;
  const role = req.user?.role || '';
  const isAdminUser = !!(req.user?.isMasterAdmin || role === 'admin' || role === 'super-admin');
  try {
    const [tenant] = await sequelize.query(
      `SELECT * FROM management_tenants WHERE tenant_code = :code ${isAdminUser ? '' : 'AND owner_numero_h = :n'} LIMIT 1`,
      { replacements: { code: tenantCode, n: req.userId }, type: sequelize.QueryTypes.SELECT }
    );
    if (!tenant) return res.status(403).json({ success: false, message: 'Accès refusé à cet établissement.' });
    req.tenant = tenant;
    return isAdminUser ? next() : enforceGestionAccess(req, res, next);
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}
// Le propriétaire et ses employés (selon leur niveau) voient les messages
const verifyTenant = avecAccesEmployes(verifyTenantProprietaire);

siteMgmtRouter.get('/:tenantCode/demandes', authenticate, verifyTenant, async (req, res) => {
  try {
    await preparerTable();
    const demandes = await sequelize.query(
      `SELECT * FROM site_demandes WHERE tenant_code = :code ORDER BY created_at DESC LIMIT 200`,
      { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, demandes });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Suivi : « nouveau » → « traité » (un changement de statut, permis à tous les employés)
siteMgmtRouter.patch('/:tenantCode/demandes/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    const statut = req.body?.statut === 'traite' ? 'traite' : 'nouveau';
    await preparerTable();
    const [rows] = await sequelize.query(
      `UPDATE site_demandes SET statut = :statut WHERE id = :id AND tenant_code = :code RETURNING id`,
      { replacements: { statut, id: req.params.id, code: req.params.tenantCode } }
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Message introuvable.' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
