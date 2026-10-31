import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { sequelize } from '../config/database.js';
import { enforceGestionAccess } from '../middleware/gestionAccessGuard.js';
import { avecAccesEmployes } from '../utils/accesEmployes.js';
import { notifierMembreEtablissement } from '../utils/notificationsEtablissement.js';
import { ajouterRoutesPhotosSite } from './photosSiteEtablissement.js';
import { ensureTenantExtraColumns } from './clinic-management.js';
import { syncAccountFromTenant } from '../utils/tenantSync.js';
import { photoDepuisFormulaire, enregistrerEnBase } from '../services/fichiersBase.js';
import { synchroniserProduit } from '../services/syncEchange.js';
import { isGlobalAdmin } from '../utils/sectorAdmin.js';

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
  lawyer: 'gestion-juridique', legal_advisor: 'gestion-juridique',
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

// Admin Moftal : les messages et commandes de TOUS les établissements, sans limite
siteMgmtRouter.get('/admin/toutes-demandes', authenticate, async (req, res) => {
  try {
    if (!isGlobalAdmin(req.user)) return res.status(403).json({ success: false, message: 'Accès réservé à l\'administrateur.' });
    await preparerTable();
    const demandes = await sequelize.query(
      `SELECT d.*, t.name AS etablissement, t.type FROM site_demandes d
       LEFT JOIN management_tenants t ON t.tenant_code = d.tenant_code
       ORDER BY d.created_at DESC LIMIT 1000`,
      { type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, demandes });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

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

// Photos du site (couverture + galerie) pour tous les établissements :
// /api/site-mgmt/:tenantCode/photos-site (Espace Pro → Photos du site)
ajouterRoutesPhotosSite(siteMgmtRouter, authenticate, verifyTenant);

// ─── Coordonnées publiées sur le site ───────────────────────────────────────
// Le responsable écrit lui-même ce que le site affiche : présentation,
// téléphone, e-mail, adresse, horaires. Enregistré dans la gestion (et recopié
// sur le compte pro), le site est à jour tout de suite.
const CHAMPS_COORDONNEES = { description: 2000, phone: 50, email: 255, address: 500, horaires: 255, phone_urgence: 50 };

siteMgmtRouter.get('/:tenantCode/coordonnees', authenticate, verifyTenant, async (req, res) => {
  try {
    await ensureTenantExtraColumns();
    const [t] = await sequelize.query(
      `SELECT name, description, phone, email, address, horaires, phone_urgence FROM management_tenants WHERE tenant_code = :code LIMIT 1`,
      { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, coordonnees: t || {} });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

siteMgmtRouter.put('/:tenantCode/coordonnees', authenticate, verifyTenant, async (req, res) => {
  try {
    await ensureTenantExtraColumns();
    const valeurs = {};
    for (const [champ, max] of Object.entries(CHAMPS_COORDONNEES)) {
      if (req.body?.[champ] !== undefined) valeurs[champ] = String(req.body[champ] || '').trim().slice(0, max);
    }
    if (valeurs.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valeurs.email)) {
      return res.status(400).json({ success: false, message: "Adresse e-mail invalide." });
    }
    const champs = Object.keys(valeurs);
    if (!champs.length) return res.status(400).json({ success: false, message: 'Aucune information envoyée.' });
    await sequelize.query(
      `UPDATE management_tenants SET ${champs.map((c) => `${c} = :${c}`).join(', ')} WHERE tenant_code = :code`,
      { replacements: { ...valeurs, code: req.params.tenantCode } }
    );
    await syncAccountFromTenant(req.params.tenantCode);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── Photo de chaque article (produit, service, bien) ───────────────────────
// Une case photo à côté de chaque article de la gestion ; la photo apparaît
// sur le site. La table vient du secteur de l'établissement (jamais du client).
const TABLE_ARTICLES = {
  artisan: 'artisan_services', beauty: 'beauty_services', producer: 'producer_products',
  lawyer: 'juridique_services', legal_advisor: 'juridique_services',
  vendor: 'retailer_products', retailer: 'retailer_products', supplier: 'supplier_products',
  broker: 'immo_properties', immobilier: 'immo_properties',
};
const colonnesPhotoArticle = {};
const preparerPhotoArticle = (table) => (colonnesPhotoArticle[table] ||= sequelize.query(
  `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS image_url TEXT`
).catch((e) => { delete colonnesPhotoArticle[table]; throw e; }));

// Vidéo et message vocal d'un article (produit, plat, service, bien) : comme la
// photo, enregistrés en base et montrés sur le site (et dans Échange pour les commerçants).
const TABLE_MEDIAS = { ...TABLE_ARTICLES, commerce: 'commerce_products', restaurant: 'resto_dishes' };
const COLONNE_MEDIA = { video: 'video_url', vocal: 'audio_url' };
const colonnesMediasArticle = {};
const preparerMediasArticle = (table) => (colonnesMediasArticle[table] ||= sequelize.query(
  `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS video_url TEXT; ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS audio_url TEXT;`
).catch((e) => { delete colonnesMediasArticle[table]; throw e; }));
export { preparerMediasArticle, TABLE_MEDIAS };

siteMgmtRouter.put('/:tenantCode/articles/:id/media', authenticate, verifyTenant, async (req, res) => {
  try {
    const table = TABLE_MEDIAS[req.tenant?.type];
    const colonne = COLONNE_MEDIA[req.body?.genre];
    if (!table || !colonne) return res.status(400).json({ success: false, message: 'Média non prévu pour cet article.' });
    await preparerMediasArticle(table);
    let url = null;
    if (req.body?.fichier) {
      const attendu = req.body.genre === 'video' ? 'video' : 'audio';
      const m = String(req.body.fichier).match(/^data:((video|audio)\/[\w.+-]+)(?:;[^,]*)?;base64,(.+)$/);
      if (!m || m[2] !== attendu) return res.status(400).json({ success: false, message: 'Fichier illisible. Essayez un autre.' });
      url = await enregistrerEnBase(
        { buffer: Buffer.from(m[3], 'base64'), mimetype: m[1], originalname: `${req.body.genre}.${m[1].split('/')[1].split(';')[0]}` },
        { proprietaire: req.params.tenantCode, usage: `${req.body.genre}-article`, tailleMax: 30 * 1024 * 1024 }
      );
    }
    const [rows] = await sequelize.query(
      `UPDATE ${table} SET ${colonne} = :url WHERE id = :id AND tenant_code = :code RETURNING id, ${colonne} AS url`,
      { replacements: { url, id: req.params.id, code: req.params.tenantCode } }
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Article introuvable.' });
    // Produit d'un commerçant : Échange suit (photo, vidéo, vocal)
    synchroniserProduit(table, req.params.id, req.params.tenantCode);
    res.json({ success: true, url: rows[0].url });
  } catch (e) {
    res.status(e.message?.startsWith('Fichier trop lourd') ? 400 : 500).json({ success: false, message: e.message?.startsWith('Fichier trop lourd') ? e.message : 'Erreur serveur' });
  }
});

siteMgmtRouter.put('/:tenantCode/articles/:id/photo', authenticate, verifyTenant, async (req, res) => {
  try {
    const table = TABLE_ARTICLES[req.tenant?.type];
    if (!table) return res.status(400).json({ success: false, message: "Les photos d'articles ne sont pas prévues pour ce secteur." });
    await preparerPhotoArticle(table);
    const image = req.body?.image ? await photoDepuisFormulaire(req.body.image, { proprietaire: req.params.tenantCode, usage: 'photo-article' }) : null;
    if (req.body?.image && !image) return res.status(400).json({ success: false, message: 'Image illisible. Essayez une autre photo.' });
    const [rows] = await sequelize.query(
      `UPDATE ${table} SET image_url = :image WHERE id = :id AND tenant_code = :code RETURNING id, image_url`,
      { replacements: { image, id: req.params.id, code: req.params.tenantCode } }
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Article introuvable.' });
    synchroniserProduit(table, req.params.id, req.params.tenantCode);
    res.json({ success: true, article: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
