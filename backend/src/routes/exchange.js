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
      `SELECT sub_sector, status, name FROM professional_accounts
       WHERE owner_numero_h=:n AND type='moftal_vendor' AND status IN ('approved', 'pending')`,
      { replacements: { n: userNumeroH }, type: sequelize.QueryTypes.SELECT }
    );

    const approvedSectors = accounts.filter(a => a.status === 'approved').map(a => a.sub_sector);
    const pendingSectors = accounts.filter(a => a.status === 'pending').map(a => a.sub_sector);
    const accountName = accounts.find(a => a.status === 'approved')?.name;

    return res.json({
      success: true,
      isVendor: approvedSectors.length > 0,
      approvedSectors,
      pendingSectors,
      accountName,
    });
  } catch (e) {
    console.error('vendor-status error:', e);
    res.json({ success: true, isVendor: false, approvedSectors: [], pendingSectors: [] });
  }
});

// @route   POST /api/exchange/register-vendor
// @desc    Inscription comme vendeur Moftal (crée un compte en attente d'approbation)
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
       VALUES (gen_random_uuid(), 'moftal_vendor', :nom, :desc, :tel, :ville, :owner, 'pending', :secteur, 'never_paid', true, NOW(), NOW())`,
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
      const [vendorOk] = await sequelize.query(
        `SELECT id FROM professional_accounts WHERE owner_numero_h=:n AND type='moftal_vendor' AND status='approved' AND sub_sector='primaire' LIMIT 1`,
        { replacements: { n: userNumeroH }, type: sequelize.QueryTypes.SELECT }
      ).catch(() => []);
      if (!vendorOk) {
        return res.status(403).json({ success: false, message: 'Accès refusé. Votre compte vendeur Moftal (secteur Alimentation) doit être approuvé par un administrateur.' });
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
      const [vendorOk] = await sequelize.query(
        `SELECT id FROM professional_accounts WHERE owner_numero_h=:n AND type='moftal_vendor' AND status='approved' AND sub_sector='secondaire' LIMIT 1`,
        { replacements: { n: userNumeroH }, type: sequelize.QueryTypes.SELECT }
      ).catch(() => []);
      if (!vendorOk) {
        return res.status(403).json({ success: false, message: 'Accès refusé. Votre compte vendeur Moftal (secteur Mode & Beauté) doit être approuvé par un administrateur.' });
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
      const [vendorOk] = await sequelize.query(
        `SELECT id FROM professional_accounts WHERE owner_numero_h=:n AND type='moftal_vendor' AND status='approved' AND sub_sector='tertiaire' LIMIT 1`,
        { replacements: { n: userNumeroH }, type: sequelize.QueryTypes.SELECT }
      ).catch(() => []);
      if (!vendorOk) {
        return res.status(403).json({ success: false, message: 'Accès refusé. Votre compte vendeur Moftal (secteur Maison & Construction) doit être approuvé par un administrateur.' });
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
      const [vendorOk] = await sequelize.query(
        `SELECT id FROM professional_accounts WHERE owner_numero_h=:n AND type='moftal_vendor' AND status='approved' AND sub_sector='quaternaire' LIMIT 1`,
        { replacements: { n: userNumeroH }, type: sequelize.QueryTypes.SELECT }
      ).catch(() => []);
      if (!vendorOk) {
        return res.status(403).json({ success: false, message: 'Accès refusé. Votre compte vendeur Moftal (secteur Technologie & Véhicules) doit être approuvé par un administrateur.' });
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
      const [vendorOk] = await sequelize.query(
        `SELECT id FROM professional_accounts WHERE owner_numero_h=:n AND type='moftal_vendor' AND status='approved' AND sub_sector='nourriture' LIMIT 1`,
        { replacements: { n: userNumeroH }, type: sequelize.QueryTypes.SELECT }
      ).catch(() => []);
      if (!vendorOk) {
        return res.status(403).json({ success: false, message: 'Accès refusé. Votre compte vendeur Moftal (secteur Restaurants) doit être approuvé par un administrateur.' });
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

// @route   DELETE /api/exchange/products/:id
// @desc    Supprimer une publication (Admin uniquement) — tous secteurs confondus
// @access  Authentifié + Admin
router.delete('/products/:id', async (req, res) => {
  try {
    const user = req.user;
    if (!isGlobalAdmin(user)) {
      return res.status(403).json({ success: false, message: 'Accès refusé. Admin requis.' });
    }

    const product = await ExchangeProduct.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Publication introuvable.' });
    }

    await product.destroy();

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

export default router;


