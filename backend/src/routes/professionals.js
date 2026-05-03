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

    // Générer le code tenant unique pour les cliniques et écoles
    const mgmtTypes = ['clinic', 'school', 'enterprise'];
    let tenantCode = account.tenant_code || null;
    if (mgmtTypes.includes(account.type) && !tenantCode) {
      const prefix = account.type === 'clinic' ? 'CLIN' : account.type === 'school' ? 'ECO' : 'ENT';
      tenantCode = `${prefix}-GN-${String(account.id).padStart(5, '0')}`;
      // Créer l'entrée dans management_tenants
      await sequelize.query(
        `INSERT INTO management_tenants (tenant_code, type, name, owner_numero_h, professional_account_id) VALUES (:code, :type, :name, :owner, :pid) ON CONFLICT (tenant_code) DO NOTHING`,
        { replacements: { code: tenantCode, type: account.type, name: account.name, owner: account.ownerNumeroH, pid: account.id } }
      );
    }

    await account.update({
      status: 'approved',
      approvedAt: new Date(),
      approvedBy: req.userId,
      subscriptionStatus: account.subscriptionStatus || 'never_paid',
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
      message: `Votre compte ${typeLabels[account.type]} "${account.name}" a été approuvé. Vous avez maintenant accès à votre espace de travail.`,
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
      subscriptionValidUntil: newValidUntil
    });

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

    for (const account of expired) {
      await account.update({ subscriptionStatus: 'overdue' });
      await Notification.createNotification({
        recipientNumeroH: account.ownerNumeroH,
        type: 'subscription_expired',
        title: 'Abonnement expiré',
        message: `Votre abonnement pour "${account.name}" a expiré. Veuillez contacter l'administrateur pour renouveler et conserver l'accès à votre dashboard.`,
        relatedId: account.id
      });
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
