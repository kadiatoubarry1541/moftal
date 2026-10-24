import express from 'express';
import multer from 'multer';
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import ExchangeProduct from '../models/ExchangeProduct.js';
import Supplier from '../models/Supplier.js';
import User from '../models/User.js';
import PageAdmin from '../models/PageAdmin.js';
import { authenticate } from '../middleware/auth.js';
import { isGlobalAdmin, getManagedSectorsForUser } from '../utils/sectorAdmin.js';
import { uploadToImageKit } from '../services/imagekitStorage.js';
import { uploadToR2 } from '../services/r2Storage.js';
import { uploadToIDrive } from '../services/idriveStorage.js';
import { notifierUtilisateur } from '../utils/notificationsEtablissement.js';

if (typeof PageAdmin.init === 'function') PageAdmin.init(sequelize);

/** Vérifie que l'utilisateur peut gérer les fournisseurs (admin ou admin secteur Échanges). */
async function canManageSuppliers(user) {
  if (!user) return false;
  if (isGlobalAdmin(user)) return true;
  const sectors = await getManagedSectorsForUser(PageAdmin, user.numeroH);
  // Autoriser l'admin du secteur Échanges global
  // ainsi que les admins dédiés aux sous-niveaux primaire/secondaire/tertiaire.
  return sectors.some(
    (s) =>
      s === 'echange' ||
      s === 'echange_primaire' ||
      s === 'echange_secondaire' ||
      s === 'echange_tertiaire'
  );
}

const router = express.Router();

/**
 * Vérifie qu'un vendeur Échange est approuvé ET à jour de paiement pour son secteur.
 * Aucun essai gratuit ni délai de grâce pour les vendeurs : dès que l'abonnement
 * mensuel n'est plus payé, la publication est bloquée.
 */
async function getVendorSubscriptionStatus(numeroH, subSector) {
  const [acc] = await sequelize.query(
    `SELECT id, subscription_status, subscription_valid_until
     FROM professional_accounts
     WHERE owner_numero_h=:n AND type='moftal_vendor' AND status='approved' AND sub_sector=:s LIMIT 1`,
    { replacements: { n: numeroH, s: subSector }, type: sequelize.QueryTypes.SELECT }
  ).catch(() => [null]);
  if (!acc) return { approved: false, aAcces: false, accountId: null };
  const validUntil = acc.subscription_valid_until ? new Date(acc.subscription_valid_until) : null;
  const aAcces = acc.subscription_status === 'active' && !!validUntil && validUntil > new Date();
  return { approved: true, aAcces, accountId: acc.id };
}

// Configuration multer pour l'upload des fichiers — en mémoire, jamais sur disque
// (le disque du serveur est effacé à chaque redémarrage/redéploiement)
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

/** Envoie les fichiers reçus (en mémoire) vers le stockage cloud (jamais le disque
 *  du serveur, qui est effacé à chaque redémarrage) — images vers ImageKit, vidéos
 *  et audios vers R2, avec une copie de sauvegarde sur IDrive e2 en arrière-plan. */
async function uploadFilesToCloud(files) {
  const images = [];
  const videos = [];
  const audio = [];
  for (const file of files || []) {
    const fieldname = file.fieldname || '';
    let url;
    if (fieldname.startsWith('image_') || fieldname === 'images') {
      url = await uploadToImageKit(file.buffer, file.originalname, 'echange');
      images.push(url);
    } else if (fieldname.startsWith('video_')) {
      url = await uploadToR2(file.buffer, file.originalname, file.mimetype, 'echange');
      videos.push(url);
    } else if (fieldname.startsWith('audio_')) {
      url = await uploadToR2(file.buffer, file.originalname, file.mimetype, 'echange');
      audio.push(url);
    } else {
      continue;
    }
    uploadToIDrive(file.buffer, file.originalname, file.mimetype, 'echange').catch(() => {});
  }
  return { images, videos, audio };
}

// Toutes les routes nécessitent l'authentification
router.use(authenticate);

// ========== VENDEURS MARKETPLACE MOFTAL ==========

// @route   GET /api/exchange/vendor-status
// @desc    Vérifie si l'utilisateur est un vendeur Moftal approuvé — un secteur à la fois,
//          un vendeur peut avoir plusieurs comptes vendeur (un par secteur), chacun approuvé séparément
// @access  Authentifié
router.get('/vendor-status', async (req, res) => {
  try {
    const userNumeroH = req.user?.numeroH || req.userId;
    if (!userNumeroH) return res.json({ success: true, isVendor: false, approvedSectors: [], pendingSectors: [] });

    if (isGlobalAdmin(req.user)) {
      return res.json({ success: true, isVendor: true, isAdmin: true, approvedSectors: ['primaire', 'secondaire', 'tertiaire', 'quaternaire'], pendingSectors: [] });
    }

    const accounts = await sequelize.query(
      `SELECT id, sub_sector, status, name, subscription_status, subscription_valid_until FROM professional_accounts
       WHERE owner_numero_h=:n AND type='moftal_vendor' AND status IN ('approved', 'pending')`,
      { replacements: { n: userNumeroH }, type: sequelize.QueryTypes.SELECT }
    );

    const maintenant = new Date();
    const approvedAccounts = accounts.filter(a => a.status === 'approved').map(a => {
      const validUntil = a.subscription_valid_until ? new Date(a.subscription_valid_until) : null;
      const aAcces = a.subscription_status === 'active' && !!validUntil && validUntil > maintenant;
      return { id: a.id, subSector: a.sub_sector, aAcces, subscriptionValidUntil: a.subscription_valid_until };
    });
    const approvedSectors = approvedAccounts.map(a => a.subSector);
    const pendingSectors = accounts.filter(a => a.status === 'pending').map(a => a.sub_sector);
    const accountName = accounts.find(a => a.status === 'approved')?.name;

    return res.json({
      success: true,
      isVendor: approvedSectors.length > 0,
      approvedSectors,
      approvedAccounts,
      pendingSectors,
      accountName,
    });
  } catch (e) {
    console.error('vendor-status error:', e);
    res.json({ success: true, isVendor: false, approvedSectors: [], pendingSectors: [] });
  }
});

// @route   POST /api/exchange/register-vendor
// @desc    Inscription comme vendeur Moftal (crée un compte en attente d'approbation).
//          Ouvert à tous : chacun peut choisir de vendre directement (vendeur)
//          ou d'approvisionner la plateforme (fournisseur, voir /suppliers).
// @access  Authentifié
router.post('/register-vendor', async (req, res) => {
  try {
    const userNumeroH = req.user?.numeroH || req.userId;

    const { nomBoutique, description, secteur, telephone, ville } = req.body;

    if (!nomBoutique || !secteur) {
      return res.status(400).json({ success: false, message: 'Nom de boutique et secteur obligatoires.' });
    }
    if (!['primaire', 'secondaire', 'tertiaire', 'quaternaire', 'nourriture'].includes(secteur)) {
      return res.status(400).json({ success: false, message: 'Secteur invalide.' });
    }

    // Vérifier qu'il n'a pas déjà une demande en cours ou un compte approuvé POUR CE SECTEUR
    // (un vendeur peut demander plusieurs secteurs séparément — chacun approuvé indépendamment)
    const [existing] = await sequelize.query(
      `SELECT id, status FROM professional_accounts WHERE owner_numero_h=:n AND type='moftal_vendor' AND sub_sector=:secteur LIMIT 1`,
      { replacements: { n: userNumeroH, secteur }, type: sequelize.QueryTypes.SELECT }
    );
    if (existing) {
      const msg = existing.status === 'approved'
        ? 'Vous avez déjà un compte vendeur Moftal approuvé pour ce secteur.'
        : existing.status === 'pending'
          ? 'Votre demande pour ce secteur est déjà en cours d\'examen. Veuillez patienter.'
          : 'Une demande existe déjà pour ce secteur.';
      return res.status(409).json({ success: false, message: msg });
    }

    await sequelize.query(
      `INSERT INTO professional_accounts (id, type, name, description, phone, city, owner_numero_h, status, sub_sector, subscription_status, is_trial, created_at, updated_at)
       VALUES (gen_random_uuid(), 'moftal_vendor', :nom, :desc, :tel, :ville, :owner, 'pending', :secteur, 'never_paid', false, NOW(), NOW())`,
      { replacements: { nom: nomBoutique, desc: description || '', tel: telephone || '', ville: ville || '', owner: userNumeroH, secteur } }
    );

    res.json({ success: true, message: 'Demande envoyée ! Un administrateur examinera votre dossier sous peu.' });
  } catch (e) {
    console.error('register-vendor error:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur : ' + e.message });
  }
});

// ========== PRODUITS ==========

// Produits primaires réservés à Moftal — aucun autre vendeur autorisé
const MOFTAL_EXCLUSIFS = ['riz', 'huile', 'rice', 'oil', 'huile alimentaire', 'huile de palme'];

// @route   GET /api/exchange/primaire/products
// @desc    Récupérer tous les produits primaires (Moftal en premier)
// @access  Authentifié
router.get('/primaire/products', async (req, res) => {
  try {
    const products = await ExchangeProduct.findAll({
      where: { isActive: true, category: 'primaire' },
      // Moftal exclusifs d'abord, puis par date
      order: [['is_moftal_exclusive', 'DESC'], ['created_at', 'DESC']]
    });

    res.json({ success: true, products });
  } catch (error) {
    console.error('Erreur lors de la récupération des produits primaires:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur lors de la récupération des produits primaires' });
  }
});

// @route   GET /api/exchange/secondaire/products
// @desc    Récupérer tous les produits secondaires
// @access  Authentifié
router.get('/secondaire/products', async (req, res) => {
  try {
    const products = await ExchangeProduct.findAll({
      where: {
        isActive: true,
        category: 'secondaire'
      },
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      products
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des produits secondaires:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des produits secondaires'
    });
  }
});

// @route   GET /api/exchange/tertiaire/products
// @desc    Récupérer tous les produits tertiaires
// @access  Authentifié
router.get('/tertiaire/products', async (req, res) => {
  try {
    const products = await ExchangeProduct.findAll({
      where: {
        isActive: true,
        category: 'tertiaire'
      },
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      products
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des produits tertiaires:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des produits tertiaires'
    });
  }
});

// @route   POST /api/exchange/primaire/products
// @desc    Créer un produit primaire
// @access  Vendeur Moftal approuvé (secteur primaire) ou Admin
router.post('/primaire/products', upload.any(), async (req, res) => {
  try {
    const { title, description, category, price, currency, condition, location } = req.body;
    const user = req.user;
    const estAdmin = isGlobalAdmin(user);
    const userNumeroH = user?.numeroH || req.userId;

    if (!estAdmin) {
      const vendorStatus = await getVendorSubscriptionStatus(userNumeroH, 'primaire');
      if (!vendorStatus.approved) {
        return res.status(403).json({ success: false, message: 'Accès refusé. Votre compte vendeur Moftal (secteur Alimentation) doit être approuvé par un administrateur.' });
      }
      if (!vendorStatus.aAcces) {
        return res.status(402).json({ success: false, blocked: true, code: 'PAYMENT_REQUIRED', proId: vendorStatus.accountId, message: 'Votre abonnement vendeur (secteur Alimentation) doit être payé pour publier.' });
      }
    }

    const sousCategorieNormalisee = (category || '').toLowerCase().trim();

    // Si c'est du riz ou de l'huile publié par l'admin → marqué Moftal (apparaît en 1er)
    // Les autres vendeurs peuvent aussi vendre du riz/huile, sans restriction
    const estProduitMoftal = estAdmin && MOFTAL_EXCLUSIFS.some(mot => sousCategorieNormalisee.includes(mot));

    const { images: imageUrls, videos: videoUrls, audio: audioUrls } = await uploadFilesToCloud(req.files);

    const product = await ExchangeProduct.create({
      title,
      description,
      category: 'primaire',
      subcategory: category,
      price: parseFloat(price),
      currency: currency || 'FG',
      condition,
      location,
      images: imageUrls,
      videos: videoUrls,
      audio: audioUrls,
      numeroH: user.numeroH,
      createdBy: user.numeroH,
      isActive: true,
      isAvailable: true,
      isMoftalExclusive: estProduitMoftal,
      moftalVendeur: estProduitMoftal ? user.numeroH : null
    });

    res.status(201).json({
      success: true,
      message: estProduitMoftal
        ? 'Produit Moftal publié en tête de liste'
        : 'Produit primaire créé avec succès',
      product
    });
  } catch (error) {
    console.error('Erreur lors de la création du produit primaire:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création du produit primaire'
    });
  }
});

// @route   POST /api/exchange/secondaire/products
// @desc    Créer un produit secondaire
// @access  Vendeur Moftal approuvé (secteur secondaire) ou Admin
router.post('/secondaire/products', upload.any(), async (req, res) => {
  try {
    const { title, description, category, price, currency, condition, location } = req.body;

    const user = req.user;
    const estAdmin = isGlobalAdmin(user);
    const userNumeroH = user?.numeroH || req.userId;

    if (!estAdmin) {
      const vendorStatus = await getVendorSubscriptionStatus(userNumeroH, 'secondaire');
      if (!vendorStatus.approved) {
        return res.status(403).json({ success: false, message: 'Accès refusé. Votre compte vendeur Moftal (secteur Mode & Beauté) doit être approuvé par un administrateur.' });
      }
      if (!vendorStatus.aAcces) {
        return res.status(402).json({ success: false, blocked: true, code: 'PAYMENT_REQUIRED', proId: vendorStatus.accountId, message: 'Votre abonnement vendeur (secteur Mode & Beauté) doit être payé pour publier.' });
      }
    }

    const { images: imageUrls, videos: videoUrls, audio: audioUrls } = await uploadFilesToCloud(req.files);

    const product = await ExchangeProduct.create({
      title,
      description,
      category: 'secondaire',
      subcategory: category,
      price: parseFloat(price),
      currency: currency || 'FG',
      condition,
      location,
      images: imageUrls,
      videos: videoUrls,
      audio: audioUrls,
      numeroH: user.numeroH,
      createdBy: user.numeroH,
      isActive: true,
      isAvailable: true
    });

    res.status(201).json({
      success: true,
      message: 'Produit secondaire créé avec succès',
      product
    });
  } catch (error) {
    console.error('Erreur lors de la création du produit secondaire:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création du produit secondaire'
    });
  }
});

// @route   POST /api/exchange/tertiaire/products
// @desc    Créer un produit tertiaire
// @access  Vendeur Moftal approuvé (secteur tertiaire) ou Admin
router.post('/tertiaire/products', upload.any(), async (req, res) => {
  try {
    const { title, description, category, price, currency, condition, location } = req.body;

    const user = req.user;
    const estAdmin = isGlobalAdmin(user);
    const userNumeroH = user?.numeroH || req.userId;

    if (!estAdmin) {
      const vendorStatus = await getVendorSubscriptionStatus(userNumeroH, 'tertiaire');
      if (!vendorStatus.approved) {
        return res.status(403).json({ success: false, message: 'Accès refusé. Votre compte vendeur Moftal (secteur Maison & Construction) doit être approuvé par un administrateur.' });
      }
      if (!vendorStatus.aAcces) {
        return res.status(402).json({ success: false, blocked: true, code: 'PAYMENT_REQUIRED', proId: vendorStatus.accountId, message: 'Votre abonnement vendeur (secteur Maison & Construction) doit être payé pour publier.' });
      }
    }

    const { images: imageUrls, videos: videoUrls, audio: audioUrls } = await uploadFilesToCloud(req.files);

    const product = await ExchangeProduct.create({
      title,
      description,
      category: 'tertiaire',
      subcategory: category,
      price: parseFloat(price),
      currency: currency || 'FG',
      condition,
      location,
      images: imageUrls,
      videos: videoUrls,
      audio: audioUrls,
      numeroH: user.numeroH,
      createdBy: user.numeroH,
      isActive: true,
      isAvailable: true
    });

    res.status(201).json({
      success: true,
      message: 'Produit tertiaire créé avec succès',
      product
    });
  } catch (error) {
    console.error('Erreur lors de la création du produit tertiaire:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création du produit tertiaire'
    });
  }
});

// @route   GET /api/exchange/quaternaire/products
// @desc    Récupérer tous les produits quaternaires (technologie & véhicules)
// @access  Authentifié
router.get('/quaternaire/products', async (req, res) => {
  try {
    const products = await ExchangeProduct.findAll({
      where: {
        isActive: true,
        category: 'quaternaire'
      },
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      products
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des produits quaternaires:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des produits quaternaires'
    });
  }
});

// @route   POST /api/exchange/quaternaire/products
// @desc    Créer un produit quaternaire (technologie & véhicules)
// @access  Vendeur Moftal approuvé (secteur quaternaire) ou Admin
router.post('/quaternaire/products', upload.any(), async (req, res) => {
  try {
    const { title, description, category, price, currency, condition, location } = req.body;

    const user = req.user;
    const estAdmin = isGlobalAdmin(user);
    const userNumeroH = user?.numeroH || req.userId;

    if (!estAdmin) {
      const vendorStatus = await getVendorSubscriptionStatus(userNumeroH, 'quaternaire');
      if (!vendorStatus.approved) {
        return res.status(403).json({ success: false, message: 'Accès refusé. Votre compte vendeur Moftal (secteur Technologie & Véhicules) doit être approuvé par un administrateur.' });
      }
      if (!vendorStatus.aAcces) {
        return res.status(402).json({ success: false, blocked: true, code: 'PAYMENT_REQUIRED', proId: vendorStatus.accountId, message: 'Votre abonnement vendeur (secteur Technologie & Véhicules) doit être payé pour publier.' });
      }
    }

    const { images: imageUrls, videos: videoUrls, audio: audioUrls } = await uploadFilesToCloud(req.files);

    const product = await ExchangeProduct.create({
      title,
      description,
      category: 'quaternaire',
      subcategory: category,
      price: parseFloat(price),
      currency: currency || 'FG',
      condition,
      location,
      images: imageUrls,
      videos: videoUrls,
      audio: audioUrls,
      numeroH: user.numeroH,
      createdBy: user.numeroH,
      isActive: true,
      isAvailable: true
    });

    res.status(201).json({
      success: true,
      message: 'Produit quaternaire créé avec succès',
      product
    });
  } catch (error) {
    console.error('Erreur lors de la création du produit quaternaire:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création du produit quaternaire'
    });
  }
});

// @route   GET /api/exchange/nourriture/products
// @desc    Récupérer tous les produits de restauration (plats, repas à emporter, traiteurs)
// @access  Authentifié
router.get('/nourriture/products', async (req, res) => {
  try {
    const products = await ExchangeProduct.findAll({
      where: {
        isActive: true,
        category: 'nourriture'
      },
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      products
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des produits de restauration:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des produits de restauration'
    });
  }
});

// @route   POST /api/exchange/nourriture/products
// @desc    Créer un produit de restauration
// @access  Vendeur Moftal approuvé (secteur nourriture) ou Admin
router.post('/nourriture/products', upload.any(), async (req, res) => {
  try {
    const { title, description, category, price, currency, condition, location } = req.body;

    const user = req.user;
    const estAdmin = isGlobalAdmin(user);
    const userNumeroH = user?.numeroH || req.userId;

    if (!estAdmin) {
      const vendorStatus = await getVendorSubscriptionStatus(userNumeroH, 'nourriture');
      if (!vendorStatus.approved) {
        return res.status(403).json({ success: false, message: 'Accès refusé. Votre compte vendeur Moftal (secteur Restaurants) doit être approuvé par un administrateur.' });
      }
      if (!vendorStatus.aAcces) {
        return res.status(402).json({ success: false, blocked: true, code: 'PAYMENT_REQUIRED', proId: vendorStatus.accountId, message: 'Votre abonnement vendeur (secteur Restaurants) doit être payé pour publier.' });
      }
    }

    const { images: imageUrls, videos: videoUrls, audio: audioUrls } = await uploadFilesToCloud(req.files);

    const product = await ExchangeProduct.create({
      title,
      description,
      category: 'nourriture',
      subcategory: category,
      price: parseFloat(price),
      currency: currency || 'FG',
      condition,
      location,
      images: imageUrls,
      videos: videoUrls,
      audio: audioUrls,
      numeroH: user.numeroH,
      createdBy: user.numeroH,
      isActive: true,
      isAvailable: true
    });

    res.status(201).json({
      success: true,
      message: 'Produit de restauration créé avec succès',
      product
    });
  } catch (error) {
    console.error('Erreur lors de la création du produit de restauration:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création du produit de restauration'
    });
  }
});

// @route   GET /api/exchange/admin/products
// @desc    Liste toutes les publications d'Échange, tous secteurs confondus (Admin uniquement)
//          — utilisé par l'espace admin pour gérer/supprimer les publications à un seul endroit
// @access  Authentifié + Admin
router.get('/admin/products', async (req, res) => {
  try {
    if (!isGlobalAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Accès refusé. Admin requis.' });
    }

    const products = await ExchangeProduct.findAll({
      where: { isActive: true },
      order: [['created_at', 'DESC']]
    });

    res.json({ success: true, products });
  } catch (error) {
    console.error('Erreur lors de la récupération des publications (admin):', error);
    res.status(500).json({ success: false, message: 'Erreur serveur lors de la récupération des publications' });
  }
});

// @route   DELETE /api/exchange/products/:id
// @desc    Retirer une publication de l'Échange — uniquement depuis l'espace admin.
//          La publication est masquée (is_active = false) : les commandes passées gardent leur historique.
// @access  Authentifié + Admin
router.delete('/products/:id', async (req, res) => {
  try {
    if (!isGlobalAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Accès refusé. Admin requis.' });
    }
    const product = await ExchangeProduct.findByPk(req.params.id);
    if (!product || product.isActive === false) {
      return res.status(404).json({ success: false, message: 'Publication introuvable.' });
    }

    await product.update({ isActive: false, isAvailable: false });

    res.json({ success: true, message: 'Publication supprimée.' });
  } catch (error) {
    console.error('Erreur lors de la suppression du produit:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur lors de la suppression.' });
  }
});

// ========== FOURNISSEURS ==========

// @route   GET /api/exchange/suppliers
// @desc    Récupérer tous les fournisseurs
// @access  Authentifié
router.get('/suppliers', async (req, res) => {
  try {
    const { status } = req.query;
    
    const where = {};
    
    if (status === 'approved') {
      where.isApproved = true;
    } else if (status === 'pending') {
      where.isApproved = false;
    }

    where.isActive = true;

    const suppliers = await Supplier.findAll({
      where,
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      suppliers
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des fournisseurs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des fournisseurs'
    });
  }
});

// @route   POST /api/exchange/suppliers
// @desc    Enregistrer un nouveau fournisseur
// @access  Authentifié
router.post('/suppliers', async (req, res) => {
  try {
    const { businessName, businessType, description, categories, contactInfo, address } = req.body;
    
    const user = req.user;

    // Vérifier si l'utilisateur est déjà fournisseur
    const existingSupplier = await Supplier.findOne({
      where: { numeroH: user.numeroH }
    });

    if (existingSupplier) {
      return res.status(400).json({
        success: false,
        message: 'Vous êtes déjà enregistré comme fournisseur'
      });
    }

    const supplier = await Supplier.create({
      numeroH: user.numeroH,
      businessName,
      businessType,
      description,
      categories: categories || [],
      contactInfo: contactInfo || {},
      address: address || {},
      isActive: true,
      isApproved: false
    });

    res.status(201).json({
      success: true,
      message: 'Demande d\'inscription envoyée. Vous serez contacté après validation.',
      supplier
    });
  } catch (error) {
    console.error('Erreur lors de l\'inscription comme fournisseur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'inscription comme fournisseur'
    });
  }
});

// @route   POST /api/exchange/suppliers/:supplierId/approve
// @desc    Approuver un fournisseur (Admin uniquement)
// @access  Authentifié + Admin
router.post('/suppliers/:supplierId/approve', authenticate, async (req, res) => {
  try {
    const { supplierId } = req.params;
    const user = req.user;

    const canManage = await canManageSuppliers(user);
    if (!canManage) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Admin ou admin secteur Échanges requis.'
      });
    }

    const supplier = await Supplier.findByPk(supplierId);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Fournisseur non trouvé'
      });
    }

    supplier.isApproved = true;
    supplier.approvedBy = user.numeroH;
    supplier.approvedAt = new Date();
    await supplier.save();

    res.json({
      success: true,
      message: 'Fournisseur approuvé avec succès',
      supplier
    });
  } catch (error) {
    console.error('Erreur lors de l\'approbation du fournisseur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'approbation du fournisseur'
    });
  }
});

// @route   POST /api/exchange/suppliers/:supplierId/reject
// @desc    Rejeter un fournisseur (Admin uniquement)
// @access  Authentifié + Admin
router.post('/suppliers/:supplierId/reject', authenticate, async (req, res) => {
  try {
    const { supplierId } = req.params;
    const { rejectionReason } = req.body;
    const user = req.user;

    const canManage = await canManageSuppliers(user);
    if (!canManage) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Admin ou admin secteur Échanges requis.'
      });
    }

    const supplier = await Supplier.findByPk(supplierId);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Fournisseur non trouvé'
      });
    }

    supplier.isApproved = false;
    supplier.rejectionReason = rejectionReason || 'Demande rejetée par l\'administrateur';
    await supplier.save();

    res.json({
      success: true,
      message: 'Demande de fournisseur rejetée',
      supplier
    });
  } catch (error) {
    console.error('Erreur lors du rejet du fournisseur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors du rejet du fournisseur'
    });
  }
});

// ========== COMMANDES ==========
// « Commander » sur une publication de l'Échange : la commande est enregistrée
// en base et arrive chez celui qui a publié (Espace Pro → Demandes, cloche +
// téléphone). L'acheteur suit sa commande ; l'admin voit toutes les commandes.

let tableCommandesPrete = null;
const preparerTableCommandes = () => (tableCommandesPrete ||= sequelize.query(`
  CREATE TABLE IF NOT EXISTS "exchange_orders" (
    "id"               SERIAL PRIMARY KEY,
    "product_id"       UUID,
    "product_title"    VARCHAR(255) NOT NULL,
    "category"         VARCHAR(50),
    "unit_price"       NUMERIC(14, 2) NOT NULL DEFAULT 0,
    "currency"         VARCHAR(10)  NOT NULL DEFAULT 'FG',
    "quantite"         INTEGER      NOT NULL DEFAULT 1,
    "total"            NUMERIC(16, 2) NOT NULL DEFAULT 0,
    "seller_numero_h"  VARCHAR(100) NOT NULL,
    "buyer_numero_h"   VARCHAR(100) NOT NULL,
    "buyer_nom"        VARCHAR(255),
    "buyer_telephone"  VARCHAR(50)  NOT NULL,
    "adresse"          VARCHAR(500),
    "message"          TEXT,
    "statut"           VARCHAR(20)  NOT NULL DEFAULT 'nouvelle',
    "created_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "updated_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS "idx_exchange_orders_seller" ON "exchange_orders" ("seller_numero_h", "created_at" DESC);
  CREATE INDEX IF NOT EXISTS "idx_exchange_orders_buyer" ON "exchange_orders" ("buyer_numero_h", "created_at" DESC);
`).catch((e) => { tableCommandesPrete = null; throw e; }));

const STATUTS_COMMANDE = {
  nouvelle: 'reçue',
  acceptee: 'acceptée',
  livree: 'livrée',
  annulee: 'annulée',
};
const texteCourt = (v, max) => String(v ?? '').trim().slice(0, max);

// @route   POST /api/exchange/products/:id/commander
// @desc    Commander une publication — la commande va à celui qui l'a publiée
// @access  Authentifié
router.post('/products/:id/commander', async (req, res) => {
  try {
    const acheteur = req.user?.numeroH || req.userId;
    const product = await ExchangeProduct.findByPk(req.params.id);
    if (!product || product.isActive === false) {
      return res.status(404).json({ success: false, message: 'Cette publication n\'existe plus.' });
    }
    const vendeur = product.numeroH || product.createdBy;
    if (!vendeur) return res.status(400).json({ success: false, message: 'Le vendeur de cette publication est introuvable.' });
    if (product.isAvailable === false) {
      return res.status(409).json({ success: false, message: 'Ce produit n\'est plus disponible.' });
    }
    // Vendeur Échange bloqué pour impayé : il ne reçoit plus de commandes
    const [vendeurBloque] = await sequelize.query(
      `SELECT 1 FROM professional_accounts WHERE owner_numero_h = :v AND type = 'moftal_vendor' AND subscription_status = 'blocked' LIMIT 1`,
      { replacements: { v: vendeur }, type: sequelize.QueryTypes.SELECT }
    ).catch(() => []);
    if (vendeurBloque) {
      return res.status(409).json({ success: false, message: 'Ce vendeur ne prend plus de commandes pour le moment.' });
    }
    if (vendeur === acheteur) {
      return res.status(400).json({ success: false, message: 'Vous ne pouvez pas commander votre propre publication.' });
    }

    const quantite = Math.min(Math.max(parseInt(req.body?.quantite, 10) || 1, 1), 100000);
    const telephone = texteCourt(req.body?.telephone, 50);
    if (telephone.replace(/[^0-9]/g, '').length < 8) {
      return res.status(400).json({ success: false, message: 'Votre numéro de téléphone est obligatoire.' });
    }
    const nom = texteCourt(req.body?.nom, 255)
      || [req.user?.prenom, req.user?.nomFamille].filter(Boolean).join(' ')
      || acheteur;
    const adresse = texteCourt(req.body?.adresse, 500);
    const message = texteCourt(req.body?.message, 2000);
    const prix = Number(product.price) || 0;
    const devise = product.currency || 'FG';

    await preparerTableCommandes();
    const [commande] = await sequelize.query(
      `INSERT INTO exchange_orders (product_id, product_title, category, unit_price, currency, quantite, total,
         seller_numero_h, buyer_numero_h, buyer_nom, buyer_telephone, adresse, message)
       VALUES (:pid, :titre, :cat, :prix, :devise, :qte, :total, :vendeur, :acheteur, :nom, :tel, :adresse, :message)
       RETURNING *`,
      {
        replacements: {
          pid: product.id, titre: product.title, cat: product.category || null, prix, devise, qte: quantite,
          total: prix * quantite, vendeur, acheteur, nom, tel: telephone, adresse: adresse || null, message: message || null,
        },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    await notifierUtilisateur(vendeur, 'commande',
      `${nom} (${telephone}) commande ${quantite} × « ${product.title} » — ${(prix * quantite).toLocaleString('fr-FR')} ${devise}`,
      { url: '/mes-comptes-pro?commandes=1' });

    res.status(201).json({ success: true, message: 'Commande envoyée au vendeur.', commande });
  } catch (e) {
    console.error('Commande Échange :', e);
    res.status(500).json({ success: false, message: 'La commande n\'a pas pu être enregistrée. Réessayez.' });
  }
});

// @route   GET /api/exchange/orders/received
// @desc    Commandes reçues par l'utilisateur (ce qu'il a publié). Admin : ?tout=1 → toutes les commandes.
// @access  Authentifié
router.get('/orders/received', async (req, res) => {
  try {
    await preparerTableCommandes();
    const moi = req.user?.numeroH || req.userId;
    const tout = isGlobalAdmin(req.user) && req.query.tout === '1';
    const commandes = await sequelize.query(
      `SELECT o.*, TRIM(CONCAT(s.prenom, ' ', s.nom_famille)) AS seller_nom
       FROM exchange_orders o LEFT JOIN users s ON s.numero_h = o.seller_numero_h
       ${tout ? '' : 'WHERE o.seller_numero_h = :moi'}
       ORDER BY o.created_at DESC LIMIT 500`,
      { replacements: { moi }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, commandes, tout });
  } catch (e) {
    console.error('Commandes reçues :', e);
    res.status(500).json({ success: false, message: 'Impossible de charger les commandes.' });
  }
});

// @route   GET /api/exchange/orders/mine
// @desc    Commandes passées par l'utilisateur (suivi acheteur)
// @access  Authentifié
router.get('/orders/mine', async (req, res) => {
  try {
    await preparerTableCommandes();
    const commandes = await sequelize.query(
      `SELECT o.*, TRIM(CONCAT(s.prenom, ' ', s.nom_famille)) AS seller_nom
       FROM exchange_orders o LEFT JOIN users s ON s.numero_h = o.seller_numero_h
       WHERE o.buyer_numero_h = :moi ORDER BY o.created_at DESC LIMIT 200`,
      { replacements: { moi: req.user?.numeroH || req.userId }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, commandes });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Impossible de charger vos commandes.' });
  }
});

// @route   PATCH /api/exchange/orders/:id
// @desc    Le vendeur (ou l'admin) suit la commande : acceptée, livrée, annulée.
//          L'acheteur peut seulement annuler une commande pas encore acceptée.
// @access  Authentifié
router.patch('/orders/:id', async (req, res) => {
  try {
    const statut = req.body?.statut;
    if (!STATUTS_COMMANDE[statut]) return res.status(400).json({ success: false, message: 'Statut invalide.' });
    await preparerTableCommandes();
    const moi = req.user?.numeroH || req.userId;
    const [commande] = await sequelize.query(
      `SELECT * FROM exchange_orders WHERE id = :id LIMIT 1`,
      { replacements: { id: req.params.id }, type: sequelize.QueryTypes.SELECT }
    );
    if (!commande) return res.status(404).json({ success: false, message: 'Commande introuvable.' });
    const estVendeur = commande.seller_numero_h === moi || isGlobalAdmin(req.user);
    const annulationAcheteur = commande.buyer_numero_h === moi && statut === 'annulee' && commande.statut === 'nouvelle';
    if (!estVendeur && !annulationAcheteur) {
      return res.status(403).json({ success: false, message: 'Accès refusé à cette commande.' });
    }
    await sequelize.query(
      `UPDATE exchange_orders SET statut = :statut, updated_at = NOW() WHERE id = :id`,
      { replacements: { statut, id: commande.id } }
    );
    const destinataire = estVendeur ? commande.buyer_numero_h : commande.seller_numero_h;
    if (destinataire !== moi) {
      await notifierUtilisateur(destinataire, 'commande',
        `Commande « ${commande.product_title} » (${commande.quantite}) : ${STATUTS_COMMANDE[statut]}.`,
        { titre: '🛒 Suivi de commande', url: estVendeur ? '/echange?mes-commandes=1' : '/mes-comptes-pro?commandes=1' });
    }
    res.json({ success: true });
  } catch (e) {
    console.error('Suivi commande :', e);
    res.status(500).json({ success: false, message: 'La commande n\'a pas pu être mise à jour.' });
  }
});

export default router;


