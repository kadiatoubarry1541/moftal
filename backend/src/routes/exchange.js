import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import ExchangeProduct from '../models/ExchangeProduct.js';
import Supplier from '../models/Supplier.js';
import Order from '../models/Order.js';
import PlatformCommission from '../models/PlatformCommission.js';
import User from '../models/User.js';
import PageAdmin from '../models/PageAdmin.js';
import FamilyFund from '../models/FamilyFund.js';
import FamilyFundTransaction from '../models/FamilyFundTransaction.js';
import { authenticate } from '../middleware/auth.js';
import { isGlobalAdmin, getManagedSectorsForUser } from '../utils/sectorAdmin.js';

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

// Configuration multer pour l'upload des fichiers
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

// Toutes les routes nécessitent l'authentification
router.use(authenticate);

// ========== VENDEURS MARKETPLACE MOFTAL ==========

// @route   GET /api/exchange/vendor-status
// @desc    Vérifie si l'utilisateur est un vendeur Moftal approuvé, retourne son secteur
// @access  Authentifié
router.get('/vendor-status', async (req, res) => {
  try {
    const userNumeroH = req.user?.numeroH || req.userId;
    if (!userNumeroH) return res.json({ success: true, isVendor: false });

    if (isGlobalAdmin(req.user)) return res.json({ success: true, isVendor: true, isAdmin: true });

    const [account] = await sequelize.query(
      `SELECT id, name, sub_sector, status FROM professional_accounts
       WHERE owner_numero_h=:n AND type='moftal_vendor' AND status='approved' LIMIT 1`,
      { replacements: { n: userNumeroH }, type: sequelize.QueryTypes.SELECT }
    );

    if (account) {
      return res.json({ success: true, isVendor: true, sector: account.sub_sector, accountName: account.name });
    }

    // Vérifier si une demande est en attente
    const [pending] = await sequelize.query(
      `SELECT id, sub_sector FROM professional_accounts
       WHERE owner_numero_h=:n AND type='moftal_vendor' AND status='pending' LIMIT 1`,
      { replacements: { n: userNumeroH }, type: sequelize.QueryTypes.SELECT }
    );

    if (pending) {
      return res.json({ success: true, isVendor: false, hasPendingRequest: true, pendingSector: pending.sub_sector });
    }

    return res.json({ success: true, isVendor: false });
  } catch (e) {
    console.error('vendor-status error:', e);
    res.json({ success: true, isVendor: false });
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

    // Vérifier qu'il n'a pas déjà une demande en cours ou un compte approuvé
    const [existing] = await sequelize.query(
      `SELECT id, status FROM professional_accounts WHERE owner_numero_h=:n AND type='moftal_vendor' LIMIT 1`,
      { replacements: { n: userNumeroH }, type: sequelize.QueryTypes.SELECT }
    );
    if (existing) {
      const msg = existing.status === 'approved'
        ? 'Vous avez déjà un compte vendeur Moftal approuvé.'
        : existing.status === 'pending'
          ? 'Votre demande est déjà en cours d\'examen. Veuillez patienter.'
          : 'Une demande existe déjà pour ce compte.';
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

// @route   GET /api/exchange/products
// @desc    Récupérer tous les produits selon le niveau
// @access  Authentifié
router.get('/products', async (req, res) => {
  try {
    const { level, category, search } = req.query;
    
    const where = {
      isActive: true
    };

    if (level) {
      where.category = level; // pricaire, secondaire, tertiaire
    }

    if (category) {
      where.subcategory = category;
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const products = await ExchangeProduct.findAll({
      where,
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      products
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des produits:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des produits'
    });
  }
});

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

// @route   POST /api/exchange/products
// @desc    Créer un nouveau produit
// @access  Authentifié
router.post('/products', upload.array('images', 10), async (req, res) => {
  try {
    const { title, description, category, subcategory, price, currency, condition, location, level } = req.body;
    
    const user = req.user;

    // Récupérer les fichiers uploadés
    const imageUrls = req.files
      .filter(file => file.fieldname.startsWith('image_'))
      .map(file => `/uploads/${file.filename}`);

    const videoUrls = req.files
      .filter(file => file.fieldname.startsWith('video_'))
      .map(file => `/uploads/${file.filename}`);

    const product = await ExchangeProduct.create({
      title,
      description,
      category: level || category,
      subcategory,
      price: parseFloat(price),
      currency: currency || 'FG',
      condition,
      location,
      images: imageUrls,
      videos: videoUrls,
      numeroH: user.numeroH,
      createdBy: user.numeroH,
      isActive: true,
      isAvailable: true
    });

    res.status(201).json({
      success: true,
      message: 'Produit créé avec succès',
      product
    });
  } catch (error) {
    console.error('Erreur lors de la création du produit:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création du produit'
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

    const imageUrls = (req.files || [])
      .filter(file => file.fieldname && file.fieldname.startsWith('image_'))
      .map(file => `/uploads/${file.filename}`);

    const videoUrls = (req.files || [])
      .filter(file => file.fieldname && file.fieldname.startsWith('video_'))
      .map(file => `/uploads/${file.filename}`);

    const audioUrls = (req.files || [])
      .filter(file => file.fieldname && file.fieldname.startsWith('audio_'))
      .map(file => `/uploads/${file.filename}`);

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

    const imageUrls = (req.files || [])
      .filter(file => file.fieldname && file.fieldname.startsWith('image_'))
      .map(file => `/uploads/${file.filename}`);

    const videoUrls = (req.files || [])
      .filter(file => file.fieldname && file.fieldname.startsWith('video_'))
      .map(file => `/uploads/${file.filename}`);

    const audioUrls = (req.files || [])
      .filter(file => file.fieldname && file.fieldname.startsWith('audio_'))
      .map(file => `/uploads/${file.filename}`);

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

    const imageUrls = (req.files || [])
      .filter(file => file.fieldname && file.fieldname.startsWith('image_'))
      .map(file => `/uploads/${file.filename}`);

    const videoUrls = (req.files || [])
      .filter(file => file.fieldname && file.fieldname.startsWith('video_'))
      .map(file => `/uploads/${file.filename}`);

    const audioUrls = (req.files || [])
      .filter(file => file.fieldname && file.fieldname.startsWith('audio_'))
      .map(file => `/uploads/${file.filename}`);

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

    const imageUrls = (req.files || [])
      .filter(file => file.fieldname && file.fieldname.startsWith('image_'))
      .map(file => `/uploads/${file.filename}`);

    const videoUrls = (req.files || [])
      .filter(file => file.fieldname && file.fieldname.startsWith('video_'))
      .map(file => `/uploads/${file.filename}`);

    const audioUrls = (req.files || [])
      .filter(file => file.fieldname && file.fieldname.startsWith('audio_'))
      .map(file => `/uploads/${file.filename}`);

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

    const imageUrls = (req.files || [])
      .filter(file => file.fieldname && file.fieldname.startsWith('image_'))
      .map(file => `/uploads/${file.filename}`);

    const videoUrls = (req.files || [])
      .filter(file => file.fieldname && file.fieldname.startsWith('video_'))
      .map(file => `/uploads/${file.filename}`);

    const audioUrls = (req.files || [])
      .filter(file => file.fieldname && file.fieldname.startsWith('audio_'))
      .map(file => `/uploads/${file.filename}`);

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

// ========== ACHAT DE PRODUITS ==========

// @route   POST /api/exchange/products/:id/purchase
// @desc    Acheter un produit (avec commission de 5%)
// @access  Authentifié
router.post('/products/:id/purchase', async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { quantity = 1, paymentMethod } = req.body;
    const buyer = req.user;

    // Récupérer le produit
    const product = await ExchangeProduct.findByPk(id, { transaction });

    if (!product) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }

    // Vérifier que le produit est disponible
    if (!product.isActive || !product.isAvailable) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Ce produit n\'est plus disponible'
      });
    }

    // Vérifier la quantité
    if (product.quantity < quantity) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Quantité insuffisante. Stock disponible: ${product.quantity}`
      });
    }

    // Empêcher l'achat de son propre produit
    if (product.numeroH === buyer.numeroH) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas acheter votre propre produit'
      });
    }

    // Récupérer le vendeur
    const seller = await User.findByPk(product.numeroH, { transaction });
    if (!seller) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Vendeur non trouvé'
      });
    }

    // Calculer les montants
    const productPrice = parseFloat(product.price);
    const qty = parseInt(quantity);
    const totalAmount = productPrice * qty;
    const commissionRate = 5.00; // 5%
    const commissionAmount = (totalAmount * commissionRate) / 100;
    const sellerAmount = totalAmount - commissionAmount;

    // ── Paiement avec solde famille : uniquement chez Moftal ─────────────────
    if (paymentMethod === 'famille') {
      if (!product.isMoftalExclusive) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          message: 'Le paiement avec le solde famille est réservé aux produits Moftal. Pour les autres vendeurs, utilisez un paiement externe.'
        });
      }

      const fund = await FamilyFund.findOne({
        where: { nomFamille: { [Op.iLike]: buyer.nomFamille?.trim() }, isActive: true },
        transaction
      });

      if (!fund) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Compte famille introuvable. Votre famille doit d\'abord créer un compte Moftal Pay.'
        });
      }

      if (fund.gerant1NumeroH !== buyer.numeroH && fund.gerant2NumeroH !== buyer.numeroH) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          message: 'Seuls les gérants du compte famille peuvent payer avec le solde famille.'
        });
      }

      const soldeNourr = Number(fund.solde_nourriture);
      if (soldeNourr < totalAmount) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Solde nourriture insuffisant. Disponible : ${soldeNourr.toLocaleString()} GNF, nécessaire : ${totalAmount.toLocaleString()} GNF.`
        });
      }

      // Débiter le compartiment nourriture
      await fund.update({
        solde_nourriture: soldeNourr - totalAmount,
        total_depense: Number(fund.total_depense) + totalAmount
      }, { transaction });

      await FamilyFundTransaction.create({
        fundId:        fund.id,
        acteurNumeroH: buyer.numeroH,
        acteurNom:     `${buyer.prenom || ''} ${buyer.nomFamille || ''}`.trim(),
        type:          'paiement_nourriture',
        montant:       totalAmount,
        beneficiaireNom: 'Moftal — Échange Primaire',
        description:   `Achat "${product.title}" (x${qty}) — Échange Primaire Moftal Pay`,
        statut:        'confirme'
      }, { transaction });
    }

    // Créer la commande
    const order = await Order.create({
      productId: product.id,
      buyerNumeroH: buyer.numeroH,
      sellerNumeroH: seller.numeroH,
      productPrice: productPrice,
      quantity: qty,
      totalAmount: totalAmount,
      commissionRate: commissionRate,
      commissionAmount: commissionAmount,
      sellerAmount: sellerAmount,
      currency: product.currency || 'GNF',
      status: 'completed',
      paymentMethod: paymentMethod || 'external',
      completedAt: new Date()
    }, { transaction });

    // Créer l'enregistrement de commission
    const commission = await PlatformCommission.create({
      orderId: order.id,
      productId: product.id,
      buyerNumeroH: buyer.numeroH,
      sellerNumeroH: seller.numeroH,
      transactionAmount: totalAmount,
      commissionRate: commissionRate,
      amount: commissionAmount,
      currency: product.currency || 'GNF',
      status: 'collected'
    }, { transaction });

    // Mettre à jour la quantité du produit
    const newQuantity = product.quantity - qty;
    await product.update({
      quantity: newQuantity,
      isAvailable: newQuantity > 0
    }, { transaction });

    // Si vous avez un système de wallet, créditer le vendeur ici
    // Exemple (à décommenter si vous implémentez le wallet) :
    /*
    const sellerWallet = parseFloat(seller.wallet || 0);
    await seller.update({
      wallet: sellerWallet + sellerAmount
    }, { transaction });
    */

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: 'Achat effectué avec succès',
      order: {
        id: order.id,
        product: {
          id: product.id,
          title: product.title
        },
        quantity: qty,
        totalAmount: totalAmount,
        commissionAmount: commissionAmount,
        sellerAmount: sellerAmount,
        currency: product.currency || 'GNF',
        status: order.status
      },
      commission: {
        amount: commissionAmount,
        rate: commissionRate
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Erreur lors de l\'achat:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'achat',
      error: error.message
    });
  }
});

// ========== COMMISSIONS DE LA PLATEFORME ==========

// @route   GET /api/exchange/commissions
// @desc    Récupérer les commissions de la plateforme (Admin uniquement)
// @access  Authentifié + Admin
router.get('/commissions', async (req, res) => {
  try {
    const user = req.user;

    // Vérifier que l'utilisateur est admin
    if (user.role !== 'admin' && user.role !== 'super-admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Admin requis.'
      });
    }

    const { startDate, endDate } = req.query;
    let commissions;

    if (startDate && endDate) {
      commissions = await PlatformCommission.getCommissionsByPeriod(startDate, endDate);
    } else {
      commissions = await PlatformCommission.findAll({
        where: { status: 'collected' },
        order: [['created_at', 'DESC']],
        limit: 100
      });
    }

    const totalCommissions = await PlatformCommission.getTotalCommissions();

    res.json({
      success: true,
      commissions,
      totalCommissions: parseFloat(totalCommissions) || 0
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des commissions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des commissions'
    });
  }
});

// @route   GET /api/exchange/orders
// @desc    Récupérer les commandes de l'utilisateur
// @access  Authentifié
router.get('/orders', async (req, res) => {
  try {
    const user = req.user;
    const { type = 'buyer' } = req.query; // 'buyer' ou 'seller'

    let orders;
    if (type === 'seller') {
      orders = await Order.getSellerOrders(user.numeroH);
    } else {
      orders = await Order.getUserOrders(user.numeroH);
    }

    res.json({
      success: true,
      orders
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des commandes:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des commandes'
    });
  }
});

export default router;


