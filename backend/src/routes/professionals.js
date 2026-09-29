import express from 'express';
import { Op } from 'sequelize';
import { authenticate, requireAdmin, isProvisionalNumeroH } from '../middleware/auth.js';
import ProfessionalAccount from '../models/ProfessionalAccount.js';
import Notification from '../models/Notification.js';
import PageAdmin from '../models/PageAdmin.js';
import { compteAGestionInterne } from '../middleware/gestionAccessGuard.js';
import { sequelize } from '../config/database.js';
import {
  isGlobalAdmin,
  getManagedSectorsForUser,
  canUserApproveProfessional,
  getProTypesForSectors
} from '../utils/sectorAdmin.js';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (typeof PageAdmin.init === 'function') PageAdmin.init(sequelize);

const router = express.Router();

/** Autorise admin global OU admin de secteur (santé, éducation, échanges). */
async function requireAdminOrSectorAdmin(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentification requise' });
    }
    if (isGlobalAdmin(req.user)) {
      req.managedSectors = null;
      return next();
    }
    const sectors = await getManagedSectorsForUser(PageAdmin, req.user.numeroH);
    if (sectors.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé - Privilèges administrateur ou admin de secteur requis'
      });
    }
    req.managedSectors = sectors;
    next();
  } catch (e) {
    console.error('requireAdminOrSectorAdmin:', e);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
}

const SUPER_ADMIN_7 = 'G7C7P7R7E7F7 7';
const SUB_ADMIN_0 = 'G0C0P0R0E0F0 0';

function isSuperAdmin7(user) {
  return user?.numeroH === SUPER_ADMIN_7;
}

/** Tout compte admin (pas seulement le compte maître) doit pouvoir tester
 * ses propres créations de comptes pro sans attendre d'approbation. */
function isAnyAdmin(user) {
  return !!(user?.isMasterAdmin || user?.role === 'admin' || user?.role === 'super-admin' || isSuperAdmin7(user));
}

function isSubAdmin0(user) {
  return user?.numeroH === SUB_ADMIN_0;
}

/** Filtre les comptes pro pour le petit admin (G0) : 50% par défaut + ceux accordés explicitement */
function filterProsForSubAdmin(accounts) {
  const granted = accounts.filter(a => a.grantedToSubAdmin);
  const grantedIds = new Set(granted.map(a => a.id));
  const notGranted = accounts.filter(a => !grantedIds.has(a.id));
  const quota = Math.ceil(notGranted.length / 2); // 50% des non-accordés
  return [...notGranted.slice(0, quota), ...granted];
}

/** Retire le justificatif des réponses publiques : réservé à l'admin uniquement. */
function sanitizeAccountForPublic(account) {
  const a = account?.toJSON ? account.toJSON() : { ...account };
  const { justificatifDocument, ...rest } = a;
  return rest;
}

/** Validation d'un compte pro vue par son propriétaire : 60 % tant que le
 * profil du propriétaire n'est pas à jour (NuméroH provisoire), 100 % dès
 * qu'il l'est (la mise à jour du profil rattache le compte pro au vrai NuméroH). */
function withValidation(account) {
  const a = sanitizeAccountForPublic(account);
  const incomplete = isProvisionalNumeroH(a.ownerNumeroH);
  return { ...a, validationPercent: incomplete ? 60 : 100, ownerProfileIncomplete: incomplete };
}

/**
 * Approuve un compte pro : génère le tenant_code si besoin et active l'essai
 * gratuit de 3 mois. Utilisé aussi bien par l'endpoint d'approbation que par
 * l'inscription directe d'un admin global (qui n'a personne pour l'approuver).
 *
 * Exception : les vendeurs Échange (moftal_vendor) n'ont AUCUN essai gratuit —
 * ils doivent payer leur abonnement mensuel immédiatement après approbation
 * pour pouvoir publier (voir exchange.js / PRIX_VENDEUR_ECHANGE).
 */
async function finalizeApproval(account, approverUserId) {
  const mgmtTypes = ['clinic', 'school', 'enterprise', 'mosque', 'madrasa', 'commerce', 'ngo', 'journalist', 'scientist', 'supplier', 'security_agency'];
  let tenantCode = account.tenant_code || null;
  if (mgmtTypes.includes(account.type) && !tenantCode) {
    const prefixMap = { clinic: 'CLIN', school: 'ECO', enterprise: 'ENT', mosque: 'MSQ', madrasa: 'MDS', commerce: 'COM', ngo: 'NGO', journalist: 'JOUR', scientist: 'SCIEN', supplier: 'FOUR', security_agency: 'SECU' };
    const prefix = prefixMap[account.type] || 'PRO';
    tenantCode = `${prefix}-GN-${String(account.id).padStart(5, '0')}`;
    await sequelize.query(
      `INSERT INTO management_tenants (tenant_code, type, name, owner_numero_h) VALUES (:code, :type, :name, :owner) ON CONFLICT (tenant_code) DO NOTHING`,
      { replacements: { code: tenantCode, type: account.type, name: account.name, owner: account.ownerNumeroH } }
    );
  }

  if (account.type === 'moftal_vendor') {
    // Pas d'essai gratuit : le vendeur doit payer son premier mois pour publier.
    await account.update({
      status: 'approved',
      approvedAt: new Date(),
      approvedBy: approverUserId,
      isTrial: false,
      ...(tenantCode ? { tenant_code: tenantCode } : {})
    });
    return account;
  }

  const finEssai = new Date();
  finEssai.setMonth(finEssai.getMonth() + 3);

  await account.update({
    status: 'approved',
    approvedAt: new Date(),
    approvedBy: approverUserId,
    subscriptionStatus: 'active',
    subscriptionValidUntil: finEssai,
    isTrial: true,
    ...(tenantCode ? { tenant_code: tenantCode } : {})
  });

  return account;
}

// ============ VÉRIFICATION NOM DISPONIBLE ============

// GET /api/professionals/verifier-nom?nom=... — vérifie si un nom est déjà pris
router.get('/verifier-nom', authenticate, async (req, res) => {
  try {
    const { nom } = req.query;
    if (!nom || !nom.trim()) {
      return res.json({ success: true, disponible: false, message: 'Nom vide.' });
    }
    const existant = await ProfessionalAccount.findOne({
      where: { name: { [Op.iLike]: nom.trim() }, status: { [Op.ne]: 'rejected' }, isActive: true }
    });
    if (existant) {
      return res.json({
        success: true,
        disponible: false,
        message: `Ce nom est déjà utilisé. Choisissez un autre nom.`
      });
    }
    res.json({ success: true, disponible: true, message: 'Nom disponible.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============ INSCRIPTION PROFESSIONNELLE ============

// POST /api/professionals/register - Inscription d'un compte professionnel
router.post('/register', authenticate, async (req, res) => {
  try {
    const { type, subSector, name, description, address, city, country, phone, email, services, specialties, photo, justificatifDocument, planType } = req.body;

    // Le logo est obligatoire : c'est l'icône de l'application de l'établissement
    if (!photo || typeof photo !== 'string' || !photo.trim()) {
      return res.status(400).json({ success: false, message: "Le logo de votre établissement est obligatoire : c'est l'icône de votre application." });
    }
    if (!type || !name) {
      return res.status(400).json({ success: false, message: 'Type et nom requis' });
    }

    const validTypes = [
      'clinic', 'health_worker', 'security_agency', 'journalist', 'enterprise', 'school',
      'supplier', 'scientist', 'ngo', 'vendor', 'producer', 'broker', 'restaurant',
      'transport', 'beauty', 'artisan', 'mairie', 'mosque', 'madrasa', 'commerce', 'reseau'
    ];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ success: false, message: 'Type invalide' });
    }

    // Validation subSector pour les types Échanges
    const echangesTypes = ['vendor', 'supplier', 'producer'];
    if (echangesTypes.includes(type) && !['primaire', 'secondaire', 'tertiaire'].includes(subSector)) {
      return res.status(400).json({ success: false, message: 'Veuillez choisir le niveau d\'échanges (primaire, secondaire ou tertiaire).' });
    }

    // ── Vérification : le nom doit être unique (insensible à la casse) ──────────
    const nomNettoye = name.trim();
    const nomExistant = await ProfessionalAccount.findOne({
      where: { name: { [Op.iLike]: nomNettoye }, status: { [Op.ne]: 'rejected' }, isActive: true }
    });
    if (nomExistant) {
      return res.status(409).json({
        success: false,
        message: `Le nom "${nomNettoye}" est déjà utilisé par une autre entreprise. Veuillez en choisir un autre.`,
        champ: 'name'
      });
    }

    const account = await ProfessionalAccount.create({
      type,
      subSector: echangesTypes.includes(type) ? subSector : (type === 'broker' ? 'tertiaire' : null),
      name,
      description: description || '',
      address: address || '',
      city: city || '',
      country: country || '',
      phone: phone || '',
      email: email || '',
      services: services || [],
      specialties: specialties || [],
      photo: photo || null,
      justificatifDocument: (justificatifDocument && String(justificatifDocument).trim()) || null,
      planType: planType === 'full' ? 'full' : 'visibility',
      ownerNumeroH: req.userId,
      status: 'pending'
    });

    // Un admin n'a pas à attendre sa propre approbation : ses créations
    // (y compris pour tester ses gestions internes) sont publiées immédiatement.
    if (isAnyAdmin(req.user)) {
      await finalizeApproval(account, req.userId);
    }

    const validated = withValidation(account);
    res.status(201).json({
      success: true,
      message: isAnyAdmin(req.user)
        ? 'Compte créé et publié.'
        : validated.ownerProfileIncomplete
          ? 'Compte créé : il est validé à 60 %. Mettez votre profil à jour pour le passer à 100 %.'
          : 'Inscription envoyée. En attente de validation par l\'administrateur.',
      validationPercent: validated.validationPercent,
      account: validated
    });
  } catch (error) {
    console.error('Erreur inscription professionnelle:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ============ CONSULTATION PUBLIQUE ============

// GET /api/professionals/approved?type=clinic - Liste des comptes approuvés par type
router.get('/approved', async (req, res) => {
  try {
    const { type } = req.query;
    let accounts;
    if (type) {
      accounts = await ProfessionalAccount.getApprovedByType(type);
    } else {
      accounts = await ProfessionalAccount.findAll({
        // Visible publiquement UNIQUEMENT si approuvé + actif + abonnement actif
        where: { status: 'approved', isActive: true, subscriptionStatus: 'active' },
        order: [['name', 'ASC']]
      });
    }
    const sanitized = (accounts || []).map(sanitizeAccountForPublic);
    res.json({ success: true, accounts: sanitized });
  } catch (error) {
    console.error('Erreur liste approuvés:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/professionals/search?q=xxx&type=clinic - Recherche
router.get('/search', async (req, res) => {
  try {
    const { q, type } = req.query;
    if (!q) return res.json({ success: true, accounts: [] });
    const accounts = await ProfessionalAccount.searchAccounts(q, type || null);
    const sanitized = (accounts || []).map(sanitizeAccountForPublic);
    res.json({ success: true, accounts: sanitized });
  } catch (error) {
    console.error('Erreur recherche:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/professionals/:id - Détails d'un compte
router.get('/detail/:id', async (req, res) => {
  try {
    const account = await ProfessionalAccount.findByPk(req.params.id);
    if (!account || !account.isActive) {
      return res.status(404).json({ success: false, message: 'Compte non trouvé' });
    }
    res.json({
      success: true,
      account: { ...sanitizeAccountForPublic(account), hasGestionInterne: await compteAGestionInterne(account) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Lit une image « data: » : en base64 (photo PNG/JPG) ou en texte (logo SVG de la
// galerie, « data:image/svg+xml;utf8,… »). Avant, tout était lu comme du base64 :
// les logos SVG sortaient cassés.
function decodeDataUrl(dataUrl) {
  const commaIdx = dataUrl.indexOf(',');
  const header = dataUrl.substring(0, commaIdx);
  const body = dataUrl.substring(commaIdx + 1);
  const mime = (header.match(/^data:([^;,]+)/) || [])[1] || 'image/png';
  const buffer = /;base64/i.test(header)
    ? Buffer.from(body, 'base64')
    : Buffer.from(decodeURIComponent(body), 'utf8');
  return { mime, buffer };
}

// GET /api/professionals/pwa-icon/:id — le logo du pro, au format PNG 512×512 des icônes d'app
router.get('/pwa-icon/:id', async (req, res) => {
  try {
    const account = await ProfessionalAccount.findByPk(req.params.id, { attributes: ['photo', 'isActive'] });
    const png = account?.photo && account.isActive ? await fabriquerIconeApp({ logo_url: account.photo }) : null;
    if (!png) return res.status(404).json({ success: false, message: 'Ajoutez le logo de votre établissement.' });
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=60'); // un nouveau logo apparaît vite partout
    res.set('Access-Control-Allow-Origin', '*');
    return res.send(png);
  } catch {
    res.status(404).end();
  }
});

// GET /api/professionals/pro-manifest/:id — manifest PWA pour l'espace de gestion pro
router.get('/pro-manifest/:id', async (req, res) => {
  try {
    const account = await ProfessionalAccount.findByPk(req.params.id, {
      attributes: ['id', 'name', 'type', 'isActive', 'photo', 'planType', 'gestionInterneValidUntil', 'ownerNumeroH']
    });
    if (!account) return res.status(404).json({ error: 'Compte introuvable' });
    // Formule Visibilité + Rendez-vous : pas d'app installable → pas de manifest
    if (!(await compteAGestionInterne(account))) {
      return res.status(404).json({ error: "Formule Visibilité + Rendez-vous : pas d'application installable" });
    }

    const TYPE_COLORS = {
      clinic: '#1a8f1a', health_worker: '#1a8f1a',
      school: '#2563eb', madrasa: '#2563eb',
      mosque: '#f43f5e', ngo: '#f43f5e',
      enterprise: '#f59e0b', restaurant: '#f97316',
      transport: '#3b82f6', beauty: '#d946ef',
      artisan: '#57534e', security_agency: '#334155',
      mairie: '#1e40af', scientist: '#4f46e5',
      commerce: '#06b6d4', journalist: '#06b6d4',
      supplier: '#06b6d4', vendor: '#06b6d4', reseau: '#06b6d4',
    };

    const themeColor = TYPE_COLORS[account.type] || '#1a8f1a';
    const relativeStart = `/espace-pro/${account.id}`;
    const pageOrigin = req.query.origin ? decodeURIComponent(req.query.origin) : '';
    const startUrl = pageOrigin ? `${pageOrigin}${relativeStart}` : relativeStart;
    // Scope spécifique à ce compte — évite le conflit avec le scope "/" de l'app Moftal principale
    const scopeUrl = pageOrigin ? `${pageOrigin}${relativeStart}` : relativeStart;


    // Icône = le logo du pro uniquement (jamais celui de Moftal ni une icône fabriquée)
    const iconUrl = `/api/professionals/pwa-icon/${account.id}?v=${encodeURIComponent(empreinteLogo(account.photo) || '0')}`;
    const icons = account.photo ? [
      { src: iconUrl, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: iconUrl, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ] : [];

    const manifest = {
      id: startUrl,
      name: account.name,
      short_name: account.name.slice(0, 12),
      description: `Gestion — ${account.name}`,
      start_url: startUrl,
      scope: scopeUrl,
      display: 'standalone',
      orientation: 'portrait',
      lang: 'fr',
      background_color: '#ffffff',
      theme_color: themeColor,
      icons,
    };

    res.set('Content-Type', 'application/manifest+json');
    res.set('Cache-Control', 'public, max-age=3600');
    res.set('Access-Control-Allow-Origin', '*');
    return res.json(manifest);
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/professionals/tenant-icon/:tenantCode — sert le logo du tenant comme vraie image
router.get('/tenant-icon/:tenantCode', async (req, res) => {
  try {
    const [tenant] = await sequelize.query(
      `SELECT mt.logo_url, pa.photo
       FROM management_tenants mt
       LEFT JOIN professional_accounts pa ON pa.tenant_code = mt.tenant_code
       WHERE mt.tenant_code = :code LIMIT 1`,
      { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    const logo = tenant?.logo_url || tenant?.photo;
    // ?fallback=none : pas de logo Moftal à la place (Gestion Interne = logo du pro uniquement)
    if (!logo) {
      if (req.query.fallback === 'none') return res.status(404).end();
      return res.status(302).redirect('/logo-moftal.svg');
    }

    if (logo.startsWith('data:')) {
      const { mime, buffer } = decodeDataUrl(logo);
      res.set('Content-Type', mime);
      res.set('Cache-Control', 'public, max-age=60'); // un nouveau logo apparaît vite partout
      res.set('Access-Control-Allow-Origin', '*');
      return res.send(buffer);
    }
    res.redirect(302, logo);
  } catch {
    if (req.query.fallback === 'none') return res.status(404).end();
    res.status(302).redirect('/logo-moftal.svg');
  }
});

// Couleur de l'icône selon le secteur (quand l'établissement n'a pas encore de logo)



// ─── Icône d'application (PNG) de l'établissement ─────────────────────────────
// Les téléphones (Chrome Android) n'acceptent qu'une image PNG comme icône d'app
// installée : pas de SVG. Le serveur n'a pas d'outil de dessin ; c'est la page de
// gestion qui dessine l'icône (logo, ou initiale sur la couleur du secteur) en PNG
// 512×512 et l'enregistre ici. « source » dit à partir de quoi elle a été dessinée,
// pour la redessiner quand le logo change.
let tenantIconColumnsReady = false;
async function ensureTenantIconColumns() {
  if (tenantIconColumnsReady) return;
  await sequelize.query(`
    ALTER TABLE management_tenants ADD COLUMN IF NOT EXISTS icon_png TEXT;
    ALTER TABLE management_tenants ADD COLUMN IF NOT EXISTS icon_source VARCHAR(200);
  `);
  tenantIconColumnsReady = true;
}

// GET /api/professionals/tenant-icon-png/:tenantCode/source — d'où vient l'icône actuelle
router.get('/tenant-icon-png/:tenantCode/source', async (req, res) => {
  try {
    await ensureTenantIconColumns();
    const [row] = await sequelize.query(
      'SELECT icon_source FROM management_tenants WHERE tenant_code = :code LIMIT 1',
      { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, source: row?.icon_source || null });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET /api/professionals/tenant-icon-png/:tenantCode — l'icône PNG (pour le manifest)
router.get('/tenant-icon-png/:tenantCode', async (req, res) => {
  try {
    await ensureTenantIconColumns();
    const [row] = await sequelize.query(
      'SELECT icon_png FROM management_tenants WHERE tenant_code = :code LIMIT 1',
      { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    if (!row?.icon_png?.startsWith('data:image/png')) return res.status(404).end();
    const { buffer } = decodeDataUrl(row.icon_png);
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=60');
    res.set('Access-Control-Allow-Origin', '*');
    return res.send(buffer);
  } catch { res.status(404).end(); }
});

// PUT /api/professionals/tenant-icon-png/:tenantCode — enregistre l'icône (propriétaire ou admin)
router.put('/tenant-icon-png/:tenantCode', authenticate, async (req, res) => {
  try {
    await ensureTenantIconColumns();
    const { png, source } = req.body || {};
    if (typeof png !== 'string' || !png.startsWith('data:image/png;base64,') || png.length > 3_000_000) {
      return res.status(400).json({ success: false, message: 'Icône invalide.' });
    }
    const [tenant] = await sequelize.query(
      'SELECT owner_numero_h FROM management_tenants WHERE tenant_code = :code LIMIT 1',
      { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    if (!tenant) return res.status(404).json({ success: false, message: 'Établissement introuvable.' });
    const role = String(req.user?.role || '').toLowerCase();
    const estAdmin = req.user?.isMasterAdmin || req.user?.isAdmin === true || role === 'admin' || role === 'super-admin';
    if (!estAdmin && tenant.owner_numero_h !== req.userId) {
      return res.status(403).json({ success: false, message: 'Non autorisé.' });
    }
    await sequelize.query(
      'UPDATE management_tenants SET icon_png = :png, icon_source = :source WHERE tenant_code = :code',
      { replacements: { png, source: String(source || '').slice(0, 200), code: req.params.tenantCode } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── Icône d'application PNG fabriquée par le serveur ─────────────────────────
// Avant, seule la page de gestion dessinait l'icône PNG, et seulement une fois
// ouverte par le propriétaire. À la toute première visite (compte neuf), le
// téléphone lisait le manifest AVANT ce dessin : pas d'icône PNG → Chrome disait
// « installée » mais aucune icône n'apparaissait sur l'écran d'accueil.
// Désormais le serveur fabrique toujours une icône PNG 512×512 : l'icône dessinée
// par la gestion si elle existe, sinon le logo, sinon l'initiale sur la couleur du secteur.
function empreinteLogo(logo) {
  if (!logo) return '';
  let h = 5381;
  for (let i = 0; i < logo.length; i += Math.max(1, Math.floor(logo.length / 4000))) h = ((h << 5) + h + logo.charCodeAt(i)) | 0;
  return 'l' + (h >>> 0).toString(36);
}

let sharpLib;
async function getSharp() {
  if (sharpLib === undefined) {
    try { sharpLib = (await import('sharp')).default; } catch { sharpLib = null; }
  }
  return sharpLib;
}

// L'icône de l'app = le logo choisi par le propriétaire, et rien d'autre. Le
// téléphone n'accepte qu'une image PNG : le logo est seulement mis au format PNG
// carré (sans rien couper ni ajouter). Sans logo, pas d'icône : la gestion
// demande d'abord le logo (champ obligatoire à l'inscription).
async function fabriquerIconeApp(tenant) {
  const logo = tenant?.logo_url;
  const sharp = await getSharp();
  if (logo && sharp) {
    try {
      let src;
      if (logo.startsWith('data:')) src = decodeDataUrl(logo).buffer;
      else if (/^https?:\/\//.test(logo)) {
        const r = await fetch(logo, { signal: AbortSignal.timeout(8000) });
        if (r.ok) src = Buffer.from(await r.arrayBuffer());
      }
      if (src) {
        const { imageAffichable } = await import('../utils/images.js');
        const lisible = (await imageAffichable(src, logo.match(/^data:([^;,]+)/)?.[1] || '')).buffer;
        return await sharp(lisible, { density: 300 })
          .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
          .flatten({ background: '#ffffff' }).png().toBuffer();
      }
    } catch { /* logo illisible : on essaie la copie PNG enregistrée */ }
  }
  // Copie PNG du même logo, dessinée par la gestion
  if (tenant?.icon_png?.startsWith('data:image/png') && tenant?.icon_source?.startsWith('logo:')) {
    return decodeDataUrl(tenant.icon_png).buffer;
  }
  return null;
}

// GET /api/professionals/tenant-app-icon/:tenantCode — icône PNG de l'app (toujours disponible)
router.get('/tenant-app-icon/:tenantCode', async (req, res) => {
  try {
    await ensureTenantIconColumns().catch(() => {});
    const [tenant] = await sequelize.query(
      `SELECT mt.name, mt.type, mt.icon_png, mt.icon_source, COALESCE(mt.logo_url, pa.photo) AS logo_url
       FROM management_tenants mt
       LEFT JOIN professional_accounts pa ON pa.tenant_code = mt.tenant_code
       WHERE mt.tenant_code = :code LIMIT 1`,
      { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    if (!tenant) return res.status(404).end();
    const png = await fabriquerIconeApp(tenant);
    if (!png) return res.status(404).json({ success: false, message: 'Ajoutez le logo de votre établissement.' });
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=300');
    res.set('Access-Control-Allow-Origin', '*');
    return res.send(png);
  } catch { res.status(404).end(); }
});

// GET /api/professionals/pro-manifest/by-tenant/:tenantCode — manifest PWA pour les pages gestion
router.get('/pro-manifest/by-tenant/:tenantCode', async (req, res) => {
  try {
    const { tenantCode } = req.params;
    // Toujours l'accueil de CETTE gestion (/gestion-ecole/CODE), jamais la sous-page
    // où l'on se trouvait : sinon l'identité de l'app changeait d'une page à l'autre.
    const demande = String(req.query.startUrl || '');
    const relativeStart = (demande.match(/^\/gestion-[a-z-]+\/[^/?#]+/i) || [])[0] || `/gestion-interne`;
    const pageOrigin = req.query.origin ? decodeURIComponent(req.query.origin) : '';
    const startUrl = pageOrigin ? `${pageOrigin}${relativeStart}` : relativeStart;
    // Scope spécifique à cet établissement — évite le conflit avec le scope "/" de l'app Moftal principale
    const scopeUrl = pageOrigin ? `${pageOrigin}${relativeStart}` : relativeStart;

    await ensureTenantIconColumns().catch(() => {});
    const [tenant] = await sequelize.query(
      `SELECT mt.tenant_code, mt.name, mt.type, COALESCE(mt.logo_url, pa.photo) AS logo_url,
              (mt.icon_png IS NOT NULL) AS has_icon_png, mt.icon_source
       FROM management_tenants mt
       LEFT JOIN professional_accounts pa ON pa.tenant_code = mt.tenant_code
       WHERE mt.tenant_code = :code LIMIT 1`,
      { replacements: { code: tenantCode }, type: sequelize.QueryTypes.SELECT }
    );

    const name = tenant?.name || tenantCode;
    const TYPE_COLORS = {
      clinic: '#1a8f1a', health_worker: '#1a8f1a',
      school: '#2563eb', madrasa: '#2563eb',
      mosque: '#f43f5e', ngo: '#f43f5e',
      enterprise: '#f59e0b', restaurant: '#f97316',
      transport: '#3b82f6', beauty: '#d946ef',
      artisan: '#57534e', security_agency: '#334155',
      mairie: '#1e40af', scientist: '#4f46e5',
      commerce: '#06b6d4', journalist: '#06b6d4',
      supplier: '#06b6d4', vendor: '#06b6d4', reseau: '#06b6d4',
    };
    const themeColor = TYPE_COLORS[tenant?.type] || '#1a8f1a';

    // Icône = le logo du propriétaire (mis au format PNG 512×512 exigé par les téléphones)
    const iconVersion = encodeURIComponent(empreinteLogo(tenant?.logo_url) || '0');
    const pngUrl = `/api/professionals/tenant-app-icon/${tenantCode}?v=${iconVersion}`;
    const icons = tenant?.logo_url ? [
      { src: pngUrl, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: pngUrl, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ] : [];

    const manifest = {
      id: startUrl,
      name,
      short_name: name.slice(0, 12),
      description: `Gestion — ${name}`,
      start_url: startUrl,
      scope: scopeUrl,
      display: 'standalone',
      orientation: 'portrait',
      lang: 'fr',
      background_color: '#ffffff',
      theme_color: themeColor,
      icons,
      // Permet au téléphone de dire si CETTE app est déjà sur l'écran d'accueil
      // (navigator.getInstalledRelatedApps) : l'URL doit être celle du manifest.
      prefer_related_applications: false,
      related_applications: pageOrigin
        ? [{ platform: 'webapp', url: `${pageOrigin}${req.originalUrl}` }]
        : [],
    };

    res.set('Content-Type', 'application/manifest+json');
    res.set('Cache-Control', 'no-cache'); // un nouveau logo / une nouvelle icône est vu tout de suite
    res.set('Access-Control-Allow-Origin', '*');
    return res.json(manifest);
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============ ESPACE PROPRIÉTAIRE ============

// GET /api/professionals/my-accounts - Mes comptes professionnels
router.get('/my-accounts', authenticate, async (req, res) => {
  try {
    const accounts = await ProfessionalAccount.getByOwner(req.userId);
    const sanitized = (accounts || []).map(withValidation);
    res.json({ success: true, accounts: sanitized });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/professionals/:id/ensure-tenant
// Auto-génère le tenant_code et l'entrée management_tenants si manquants
router.post('/:id/ensure-tenant', authenticate, async (req, res) => {
  try {
    const account = await ProfessionalAccount.findByPk(req.params.id);
    if (!account) return res.status(404).json({ success: false, message: 'Compte introuvable.' });

    const ownerMatch = account.ownerNumeroH === req.userId || account.ownerNumeroH === req.user?.numeroH;
    const isAdminUser = !!(req.user?.isMasterAdmin || req.user?.role === 'admin' || req.user?.role === 'super-admin');
    if (!ownerMatch && !isAdminUser) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }

    if (account.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Le compte doit être approuvé.' });
    }

    const prefixMap = { clinic:'CLIN', school:'ECO', enterprise:'ENT', mosque:'MSQ', madrasa:'MDS', commerce:'COM', ngo:'NGO', journalist:'JOUR', scientist:'SCIEN', supplier:'FOUR', security_agency:'SECU', vendor:'VENT', producer:'PROD', broker:'BROK', restaurant:'REST', transport:'TRANS', mairie:'MAIR', beauty:'BEAU', artisan:'ARTIS', immobilier:'IMMO', reseau:'RESEAU' };
    const prefix = prefixMap[account.type] || 'PRO';
    const tenantCode = account.tenant_code || `${prefix}-GN-${String(account.id).padStart(5, '0')}`;

    await sequelize.query(
      `INSERT INTO management_tenants (tenant_code, type, name, owner_numero_h, logo_url)
       VALUES (:code, :type, :name, :owner, :logo)
       ON CONFLICT (tenant_code) DO UPDATE SET logo_url = COALESCE(management_tenants.logo_url, EXCLUDED.logo_url)`,
      { replacements: { code: tenantCode, type: account.type, name: account.name, owner: account.ownerNumeroH, logo: account.photo || null } }
    ).catch(() => {});

    if (!account.tenant_code) {
      await account.update({ tenant_code: tenantCode });
    }

    res.json({ success: true, tenantCode });
  } catch (e) {
    console.error('ensure-tenant:', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /api/professionals/:id/connect-client
router.post('/:id/connect-client', authenticate, async (req, res) => {
  try {
    const account = await ProfessionalAccount.findByPk(req.params.id);
    if (!account) return res.status(404).json({ success: false, message: 'Compte non trouvé' });
    if (account.ownerNumeroH !== req.userId) return res.status(403).json({ success: false, message: 'Non autorisé' });

    const { clientNumeroH } = req.body;
    if (!clientNumeroH) return res.status(400).json({ success: false, message: 'clientNumeroH requis' });

    // Notifier le client
    await Notification.create({
      recipientNumeroH: clientNumeroH,
      senderNumeroH: req.userId,
      type: 'pro_connection',
      message: `${account.name} vous a connecté à son espace professionnel.`,
      isRead: false
    }).catch(() => {}); // non bloquant si le champ type n'est pas dans l'ENUM

    res.json({ success: true, message: `Client connecté à ${account.name} avec succès.` });
  } catch (e) {
    console.error('connect-client:', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// PUT /api/professionals/:id - Mettre à jour mon compte
router.put('/:id', authenticate, async (req, res) => {
  try {
    const account = await ProfessionalAccount.findByPk(req.params.id);
    if (!account) {
      return res.status(404).json({ success: false, message: 'Compte non trouvé' });
    }
    if (account.ownerNumeroH !== req.userId) {
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    }

  const { name, description, address, city, country, phone, email, services, specialties, photo, billingInfo } = req.body;
    await account.update({
      name: name || account.name,
      description: description !== undefined ? description : account.description,
      address: address !== undefined ? address : account.address,
      city: city !== undefined ? city : account.city,
      country: country !== undefined ? country : account.country,
      phone: phone !== undefined ? phone : account.phone,
      email: email !== undefined ? email : account.email,
      services: services !== undefined ? services : account.services,
      specialties: specialties !== undefined ? specialties : account.specialties,
      photo: photo !== undefined ? photo : account.photo,
      billingInfo: billingInfo !== undefined ? billingInfo : account.billingInfo
    });

    // Synchroniser management_tenants pour que la vitrine publique soit à jour
    if (account.tenant_code) {
      await sequelize.query(
        `UPDATE management_tenants SET name=:name, description=:desc, address=:addr, phone=:phone, email=:email, logo_url=:logo WHERE tenant_code=:code`,
        { replacements: { name: account.name, desc: account.description || '', addr: account.address || '', phone: account.phone || '', email: account.email || '', logo: account.photo || null, code: account.tenant_code } }
      ).catch(() => {});
    }

    res.json({ success: true, account: sanitizeAccountForPublic(account) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ============ ADMINISTRATION ============

// GET /api/professionals/admin/pending - Comptes en attente (admin ou admin secteur)
router.get('/admin/pending', authenticate, requireAdminOrSectorAdmin, async (req, res) => {
  try {
    let accounts = await ProfessionalAccount.getPendingAccounts();
    if (req.managedSectors && req.managedSectors.length > 0) {
      const types = getProTypesForSectors(req.managedSectors);
      accounts = accounts.filter(a => types.includes(a.type));
    }
    // Petit admin (G0) : seulement 50% + accordés
    if (isSubAdmin0(req.user)) {
      accounts = filterProsForSubAdmin(accounts);
    }
    res.json({ success: true, accounts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/professionals/admin/tenants - Tous les espaces Gestion Interne (admin seulement)
router.get('/admin/tenants', authenticate, requireAdmin, async (req, res) => {
  try {
    const tenants = await sequelize.query(
      `SELECT mt.*, pa.id as professional_account_id, pa.description, pa.address, pa.city, pa.phone, pa.email, pa.photo
       FROM management_tenants mt
       LEFT JOIN professional_accounts pa ON pa.tenant_code = mt.tenant_code
       WHERE mt.is_active = true
       ORDER BY mt.type, mt.name`,
      { type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, tenants });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/professionals/admin/all - Tous les comptes (admin ou admin secteur)
router.get('/admin/all', authenticate, requireAdminOrSectorAdmin, async (req, res) => {
  try {
    const { type, status } = req.query;
    const where = { isActive: true };
    if (type) where.type = type;
    if (status) where.status = status;
    if (req.managedSectors && req.managedSectors.length > 0) {
      const types = getProTypesForSectors(req.managedSectors);
      where.type = types.length === 1 ? types[0] : { [Op.in]: types };
    }
    let accounts = await ProfessionalAccount.findAll({ where, order: [['created_at', 'DESC']] });
    // Petit admin (G0) : seulement 50% + accordés
    if (isSubAdmin0(req.user)) {
      accounts = filterProsForSubAdmin(accounts);
    }
    res.json({ success: true, accounts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/professionals/admin/grant-visibility/:id - Accorder visibilité au petit admin (G7 seulement)
router.post('/admin/grant-visibility/:id', authenticate, async (req, res) => {
  try {
    if (!isSuperAdmin7(req.user)) {
      return res.status(403).json({ success: false, message: 'Réservé au super admin principal' });
    }
    const account = await ProfessionalAccount.findByPk(req.params.id);
    if (!account) return res.status(404).json({ success: false, message: 'Compte non trouvé' });
    await account.update({ grantedToSubAdmin: true });
    res.json({ success: true, message: `Visibilité accordée au petit admin pour "${account.name}"` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/professionals/admin/revoke-visibility/:id - Retirer visibilité au petit admin (G7 seulement)
router.post('/admin/revoke-visibility/:id', authenticate, async (req, res) => {
  try {
    if (!isSuperAdmin7(req.user)) {
      return res.status(403).json({ success: false, message: 'Réservé au super admin principal' });
    }
    const account = await ProfessionalAccount.findByPk(req.params.id);
    if (!account) return res.status(404).json({ success: false, message: 'Compte non trouvé' });
    await account.update({ grantedToSubAdmin: false });
    res.json({ success: true, message: `Visibilité retirée pour "${account.name}"` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/professionals/admin/approve/:id - Approuver un compte (admin ou admin secteur)
router.post('/admin/approve/:id', authenticate, async (req, res) => {
  try {
    const account = await ProfessionalAccount.findByPk(req.params.id);
    if (!account) {
      return res.status(404).json({ success: false, message: 'Compte non trouvé' });
    }
    const canApprove = await canUserApproveProfessional(PageAdmin, req.user, account.type, account.subSector);
    if (!canApprove) {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez approuver que les comptes de votre secteur (santé, éducation ou échanges).'
      });
    }

    await finalizeApproval(account, req.userId);

    // Notifier le propriétaire
    const typeLabels = {
      clinic: 'Clinique/Hôpital',
      security_agency: 'Agence de sécurité',
      journalist: 'Journaliste',
      enterprise: 'Entreprise',
      school: 'École/Professeur',
      supplier: 'Fournisseur',
      vendor: 'Vendeur',
      producer: 'Entreprise de production',
      broker: 'Démarcheur / Location'
    };

    await Notification.createNotification({
      recipientNumeroH: account.ownerNumeroH,
      type: 'account_approved',
      title: 'Compte approuvé !',
      message: `Votre compte ${typeLabels[account.type] || account.type} "${account.name}" a été approuvé ! Vous bénéficiez de 3 mois d'essai gratuit. Profitez-en pour explorer votre espace professionnel, recevoir des rendez-vous et gérer votre activité.`,
      relatedId: account.id
    });

    res.json({ success: true, message: 'Compte approuvé', account });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/professionals/admin/subscription/:id - Mettre à jour le statut d'abonnement (paiement)
router.post('/admin/subscription/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const account = await ProfessionalAccount.findByPk(req.params.id);
    if (!account) {
      return res.status(404).json({ success: false, message: 'Compte non trouvé' });
    }

    const { status, validUntil, renew } = req.body;
    const allowed = ['never_paid', 'active', 'overdue', 'blocked'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Statut d\'abonnement invalide' });
    }

    // Calcul de la date de validité
    let newValidUntil = account.subscriptionValidUntil;
    if (validUntil) {
      newValidUntil = new Date(validUntil);
    } else if (status === 'active') {
      if (renew && account.subscriptionValidUntil && new Date(account.subscriptionValidUntil) > new Date()) {
        // Renouvellement : prolonger depuis la date d'expiration actuelle
        newValidUntil = new Date(account.subscriptionValidUntil);
        newValidUntil.setDate(newValidUntil.getDate() + 30);
      } else {
        // Nouvelle activation : 30 jours depuis aujourd'hui
        newValidUntil = new Date();
        newValidUntil.setDate(newValidUntil.getDate() + 30);
      }
    } else if (status === 'blocked' || status === 'overdue') {
      // Pas de changement sur la date (garder l'historique)
    } else if (status === 'never_paid') {
      newValidUntil = null;
    }

    await account.update({
      subscriptionStatus: status,
      subscriptionValidUntil: newValidUntil,
      // Dès qu'un admin confirme un paiement (activation manuelle), ce n'est plus un essai
      ...(status === 'active' ? { isTrial: false } : {})
    });

    // Créer le tenant_code et l'entrée management si manquant lors d'une activation
    if (status === 'active' && !account.tenant_code) {
      const mgmtTypes = ['clinic', 'school', 'enterprise', 'mosque', 'madrasa', 'commerce', 'ngo', 'journalist', 'scientist', 'supplier', 'security_agency'];
      if (mgmtTypes.includes(account.type)) {
        const prefixMap = { clinic: 'CLIN', school: 'ECO', enterprise: 'ENT', mosque: 'MSQ', madrasa: 'MDS', commerce: 'COM', ngo: 'NGO', journalist: 'JOUR', scientist: 'SCIEN', supplier: 'FOUR', security_agency: 'SECU' };
        const prefix = prefixMap[account.type] || 'PRO';
        const newTenantCode = `${prefix}-GN-${String(account.id).padStart(5, '0')}`;
        await sequelize.query(
          `INSERT INTO management_tenants (tenant_code, type, name, owner_numero_h) VALUES (:code, :type, :name, :owner) ON CONFLICT (tenant_code) DO NOTHING`,
          { replacements: { code: newTenantCode, type: account.type, name: account.name, owner: account.ownerNumeroH } }
        );
        await account.update({ tenant_code: newTenantCode });
      }
    }

    // Envoyer une notification si activation ou suspension
    if (status === 'active') {
      const expiryDate = newValidUntil ? new Date(newValidUntil).toLocaleDateString('fr-FR') : '?';
      await Notification.createNotification({
        recipientNumeroH: account.ownerNumeroH,
        type: 'subscription_activated',
        title: 'Abonnement activé !',
        message: `Votre abonnement pour "${account.name}" est actif jusqu'au ${expiryDate}. Vous pouvez accéder à votre dashboard.`,
        relatedId: account.id
      });
    } else if (status === 'blocked') {
      await Notification.createNotification({
        recipientNumeroH: account.ownerNumeroH,
        type: 'subscription_blocked',
        title: 'Abonnement suspendu',
        message: `L'accès à votre compte "${account.name}" a été suspendu pour impayé. Contactez l'administrateur pour régulariser.`,
        relatedId: account.id
      });
    }

    return res.json({ success: true, account: sanitizeAccountForPublic(account) });
  } catch (error) {
    console.error('Erreur abonnement pro:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/professionals/admin/check-expired - Passer les abonnements expirés en "overdue"
router.post('/admin/check-expired', authenticate, requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const expired = await ProfessionalAccount.findAll({
      where: {
        subscriptionStatus: 'active',
        subscriptionValidUntil: { [Op.lt]: now }
      }
    });

    const ADMIN_NUMERO_H = 'G7C7P7R7E7F7 7';

    for (const account of expired) {
      await account.update({ subscriptionStatus: 'overdue' });

      // Notifier le professionnel
      await Notification.createNotification({
        recipientNumeroH: account.ownerNumeroH,
        type: 'subscription_expired',
        title: account.isTrial ? 'Essai gratuit terminé' : 'Abonnement expiré',
        message: account.isTrial
          ? `Votre essai gratuit de 3 mois pour "${account.name}" est terminé. Votre profil n'est plus visible publiquement. Contactez l'administrateur pour activer votre abonnement et continuer.`
          : `Votre abonnement pour "${account.name}" a expiré. Veuillez contacter l'administrateur pour renouveler et conserver l'accès à votre dashboard.`,
        relatedId: account.id
      });

      // Notifier l'admin pour les comptes en essai expiré → à facturer
      if (account.isTrial) {
        await Notification.createNotification({
          recipientNumeroH: ADMIN_NUMERO_H,
          type: 'trial_expired',
          title: '💰 Essai expiré — À facturer',
          message: `L'essai gratuit de "${account.name}" (${account.type}) est terminé. Propriétaire : ${account.ownerNumeroH}. Contactez-le pour l'abonnement.`,
          relatedId: account.id
        });
      }
    }

    return res.json({ success: true, updated: expired.length, message: `${expired.length} abonnement(s) passé(s) en retard.` });
  } catch (error) {
    console.error('Erreur check-expired:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/professionals/admin/reject/:id - Rejeter un compte (admin ou admin secteur)
router.post('/admin/reject/:id', authenticate, async (req, res) => {
  try {
    const account = await ProfessionalAccount.findByPk(req.params.id);
    if (!account) {
      return res.status(404).json({ success: false, message: 'Compte non trouvé' });
    }
    const canReject = await canUserApproveProfessional(PageAdmin, req.user, account.type, account.subSector);
    if (!canReject) {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez rejeter que les comptes de votre secteur (santé, éducation ou échanges).'
      });
    }

    const { reason } = req.body;
    await account.update({
      status: 'rejected',
      rejectionReason: reason || 'Demande rejetée par l\'administrateur'
    });

    await Notification.createNotification({
      recipientNumeroH: account.ownerNumeroH,
      type: 'account_rejected',
      title: 'Compte non approuvé',
      message: `Votre demande "${account.name}" a été rejetée. Raison: ${reason || 'Non spécifiée'}`,
      relatedId: account.id
    });

    res.json({ success: true, message: 'Compte rejeté', account });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// DELETE /api/professionals/admin/:id - Supprimer un compte (admin)
router.delete('/admin/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const account = await ProfessionalAccount.findByPk(req.params.id);
    if (!account) {
      return res.status(404).json({ success: false, message: 'Compte non trouvé' });
    }
    // Suppression par l'admin : le compte disparaît partout (listes, espace du pro),
    // sa gestion interne et son site client sont désactivés, et son nom redevient
    // libre. Les données restent en base (rien n'est détruit définitivement).
    await account.update({ isActive: false });
    if (account.tenant_code) {
      await sequelize.query(
        `UPDATE management_tenants SET is_active = false WHERE tenant_code = :code`,
        { replacements: { code: account.tenant_code } }
      );
    }
    res.json({ success: true, message: `Compte « ${account.name} » supprimé` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// DEBUG: Compter les comptes professionnels présents en base
// GET /api/professionals/admin/debug-count
router.get('/admin/debug-count', authenticate, async (req, res) => {
  try {
    const total = await ProfessionalAccount.count();
    const active = await ProfessionalAccount.count({ where: { isActive: true } });
    const approved = await ProfessionalAccount.count({ where: { status: 'approved', isActive: true } });
    return res.json({ success: true, total, active, approved });
  } catch (error) {
    console.error('Erreur debug-count:', error);
    return res.status(500).json({ success: false, message: 'Erreur debug-count' });
  }
});

export default router;
