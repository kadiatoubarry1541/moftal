import express from 'express';
import multer from 'multer';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import HealthProduct from '../models/HealthProduct.js';
import { Op } from 'sequelize';
import { uploadToImageKit } from '../services/imagekitStorage.js';
import { uploadToIDrive } from '../services/idriveStorage.js';

const router = express.Router();

// Upload en mémoire pour les images de produits — jamais sur le disque du
// serveur (effacé à chaque redémarrage/redéploiement), envoyé vers le cloud.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers image sont autorisés'), false);
    }
  }
});

// Toutes les routes nécessitent l'authentification
router.use(authenticate);

// ========== PRODUITS GRATUITS ==========

// @route   GET /api/state-products/free
// @desc    Récupérer tous les produits gratuits (pour les citoyens)
// @access  Authentifié
router.get('/free', async (req, res) => {
  try {
    const { category, search } = req.query;
    
    let where = {
      isFree: true,
      publishedByState: true,
      isActive: true
    };

    if (category) {
      where.category = category;
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { brand: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const products = await HealthProduct.findAll({
      where,
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      products
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des produits gratuits:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des produits gratuits'
    });
  }
});

// @route   POST /api/state-products/publish
// @desc    Publier un produit gratuit (Admin/État uniquement)
// @access  Admin uniquement
router.post('/publish', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      brand,
      dosage,
      isPrescriptionRequired,
      sideEffects,
      contraindications,
      distributionLocation,
      distributionDate,
      quantityAvailable
    } = req.body;
    const user = req.user;

    if (!name || !category) {
      return res.status(400).json({
        success: false,
        message: 'Nom et catégorie sont requis'
      });
    }

    const productData = {
      name,
      description: description || '',
      category,
      brand: brand || null,
      dosage: dosage || null,
      price: 0, // Produit gratuit
      currency: 'GNF',
      availability: quantityAvailable > 0 ? 'disponible' : 'rupture de stock',
      isPrescriptionRequired: isPrescriptionRequired === 'true' || isPrescriptionRequired === true,
      isFree: true,
      publishedByState: true,
      distributionLocation: distributionLocation || null,
      distributionDate: distributionDate ? new Date(distributionDate) : null,
      quantityAvailable: parseInt(quantityAvailable) || 0,
      sideEffects: sideEffects || null,
      contraindications: contraindications || null,
      createdBy: user.numeroH,
      isActive: true
    };

    if (req.file) {
      productData.imageUrl = await uploadToImageKit(req.file.buffer, req.file.originalname, 'state-products');
      uploadToIDrive(req.file.buffer, req.file.originalname, req.file.mimetype, 'state-products').catch(() => {});
    }

    const product = await HealthProduct.create(productData);

    res.status(201).json({
      success: true,
      message: 'Produit gratuit publié avec succès',
      product
    });
  } catch (error) {
    console.error('Erreur lors de la publication du produit:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la publication du produit'
    });
  }
});

// @route   PUT /api/state-products/:productId
// @desc    Modifier un produit gratuit (Admin uniquement)
// @access  Admin uniquement
router.put('/:productId', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const { productId } = req.params;
    const {
      name,
      description,
      category,
      brand,
      dosage,
      isPrescriptionRequired,
      sideEffects,
      contraindications,
      distributionLocation,
      distributionDate,
      quantityAvailable
    } = req.body;

    const product = await HealthProduct.findByPk(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }

    if (!product.publishedByState) {
      return res.status(403).json({
        success: false,
        message: 'Ce produit n\'est pas publié par l\'État'
      });
    }

    if (name) product.name = name;
    if (description !== undefined) product.description = description;
    if (category) product.category = category;
    if (brand !== undefined) product.brand = brand;
    if (dosage !== undefined) product.dosage = dosage;
    if (isPrescriptionRequired !== undefined) product.isPrescriptionRequired = isPrescriptionRequired === 'true' || isPrescriptionRequired === true;
    if (sideEffects !== undefined) product.sideEffects = sideEffects;
    if (contraindications !== undefined) product.contraindications = contraindications;
    if (distributionLocation !== undefined) product.distributionLocation = distributionLocation;
    if (distributionDate !== undefined) product.distributionDate = distributionDate ? new Date(distributionDate) : null;
    if (quantityAvailable !== undefined) {
      product.quantityAvailable = parseInt(quantityAvailable) || 0;
      product.availability = product.quantityAvailable > 0 ? 'disponible' : 'rupture de stock';
    }

    if (req.file) {
      product.imageUrl = await uploadToImageKit(req.file.buffer, req.file.originalname, 'state-products');
      uploadToIDrive(req.file.buffer, req.file.originalname, req.file.mimetype, 'state-products').catch(() => {});
    }

    await product.save();

    res.json({
      success: true,
      message: 'Produit modifié avec succès',
      product
    });
  } catch (error) {
    console.error('Erreur lors de la modification du produit:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la modification du produit'
    });
  }
});

// @route   DELETE /api/state-products/:productId
// @desc    Supprimer un produit gratuit (Admin uniquement)
// @access  Admin uniquement
router.delete('/:productId', requireAdmin, async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await HealthProduct.findByPk(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }

    if (!product.publishedByState) {
      return res.status(403).json({
        success: false,
        message: 'Ce produit n\'est pas publié par l\'État'
      });
    }

    product.isActive = false;
    await product.save();

    res.json({
      success: true,
      message: 'Produit retiré avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du produit:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la suppression du produit'
    });
  }
});

// @route   GET /api/state-products/admin/all
// @desc    Récupérer tous les produits publiés par l'État (Admin uniquement)
// @access  Admin uniquement
router.get('/admin/all', requireAdmin, async (req, res) => {
  try {
    const products = await HealthProduct.findAll({
      where: {
        publishedByState: true
      },
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

export default router;

