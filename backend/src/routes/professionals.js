import express from 'express';
import { Op } from 'sequelize';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import ProfessionalAccount from '../models/ProfessionalAccount.js';
import Notification from '../models/Notification.js';
import PageAdmin from '../models/PageAdmin.js';
import { sequelize } from '../config/database.js';
import {
  isGlobalAdmin,
  getManagedSectorsForUser,
  canUserApproveProfessional,
  getProTypesForSectors
} from '../utils/sectorAdmin.js';

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

// ============ VÉRIFICATION NOM DISPONIBLE ============

// GET /api/professionals/verifier-nom?nom=... — vérifie si un nom est déjà pris
router.get('/verifier-nom', authenticate, async (req, res) => {
  try {
    const { nom } = req.query;
    if (!nom || !nom.trim()) {
      return res.json({ success: true, disponible: false, message: 'Nom vide.' });
    }
    const existant = await ProfessionalAccount.findOne({
      where: { name: { [Op.iLike]: nom.trim() }, status: { [Op.ne]: 'rejected' } }
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
    const { type, subSector, name, description, address, city, country, phone, email, services, specialties, photo, justificatifDocument } = req.body;

    if (!type || !name) {
      return res.status(400).json({ success: false, message: 'Type et nom requis' });
    }

    const validTypes = [
      'clinic', 'security_agency', 'journalist', 'enterprise', 'school',
      'supplier', 'scientist', 'ngo', 'vendor', 'producer', 'broker', 'restaurant'
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
      where: { name: { [Op.iLike]: nomNettoye }, status: { [Op.ne]: 'rejected' } }
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
      justificatifDocument: String(justificatifDocument).trim() || null,
      ownerNumeroH: req.userId,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Inscription envoyée. En attente de validation par l\'administrateur.',
      account: sanitizeAccountForPublic(account)
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
    res.json({ success: true, account: sanitizeAccountForPublic(account) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/professionals/pwa-icon/:id — sert le logo du pro comme vraie image PNG
// Requis pour les manifests PWA (les data URIs sont refusées par Chrome)
router.get('/pwa-icon/:id', async (req, res) => {
  try {
    const account = await ProfessionalAccount.findByPk(req.params.id, {
      attributes: ['photo', 'isActive']
    });
    if (!account?.photo || !account.isActive) {
      return res.status(302).redirect('https://moftal.com/icon-192.png');
    }
    const photo = account.photo;
    if (photo.startsWith('data:')) {
      const commaIdx = photo.indexOf(',');
      const header = photo.substring(0, commaIdx);
      const base64 = photo.substring(commaIdx + 1);
      const mimeMatch = header.match(/data:([^;]+);/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/png';
      const buffer = Buffer.from(base64, 'base64');
      res.set('Content-Type', mime);
      res.set('Cache-Control', 'public, max-age=86400');
      res.set('Access-Control-Allow-Origin', '*');
      return res.send(buffer);
    }
    // URL externe : rediriger
    res.redirect(302, photo);
  } catch {
    res.status(302).redirect('https://moftal.com/icon-192.png');
  }
});

// ============ ESPACE PROPRIÉTAIRE ============

// GET /api/professionals/my-accounts - Mes comptes professionnels
router.get('/my-accounts', authenticate, async (req, res) => {
  try {
    const accounts = await ProfessionalAccount.getByOwner(req.userId);
    const sanitized = (accounts || []).map(sanitizeAccountForPublic);
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
      `INSERT INTO management_tenants (tenant_code, type, name, owner_numero_h) VALUES (:code, :type, :name, :owner) ON CONFLICT (tenant_code) DO NOTHING`,
      { replacements: { code: tenantCode, type: account.type, name: account.name, owner: account.ownerNumeroH } }
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
      `SELECT * FROM management_tenants WHERE is_active = true ORDER BY type, name`,
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

    // Générer le code tenant unique pour tous les types avec Gestion Interne
    const mgmtTypes = ['clinic', 'school', 'enterprise', 'mosque', 'madrasa', 'commerce', 'ngo', 'journalist', 'scientist', 'supplier', 'security_agency'];
    let tenantCode = account.tenant_code || null;
    if (mgmtTypes.includes(account.type) && !tenantCode) {
      const prefixMap = { clinic: 'CLIN', school: 'ECO', enterprise: 'ENT', mosque: 'MSQ', madrasa: 'MDS', commerce: 'COM', ngo: 'NGO', journalist: 'JOUR', scientist: 'SCIEN', supplier: 'FOUR', security_agency: 'SECU' };
      const prefix = prefixMap[account.type] || 'PRO';
      tenantCode = `${prefix}-GN-${String(account.id).padStart(5, '0')}`;
      // Créer l'entrée dans management_tenants
      await sequelize.query(
        `INSERT INTO management_tenants (tenant_code, type, name, owner_numero_h) VALUES (:code, :type, :name, :owner) ON CONFLICT (tenant_code) DO NOTHING`,
        { replacements: { code: tenantCode, type: account.type, name: account.name, owner: account.ownerNumeroH } }
      );
    }

    // Calculer la fin de l'essai gratuit (3 mois à partir d'aujourd'hui)
    const finEssai = new Date();
    finEssai.setMonth(finEssai.getMonth() + 3);

    await account.update({
      status: 'approved',
      approvedAt: new Date(),
      approvedBy: req.userId,
      // ── Essai gratuit 3 mois activé automatiquement à l'approbation ──
      subscriptionStatus: 'active',
      subscriptionValidUntil: finEssai,
      isTrial: true,
      ...(tenantCode ? { tenant_code: tenantCode } : {})
    });

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
    await account.update({ isActive: false });
    res.json({ success: true, message: 'Compte supprimé' });
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
