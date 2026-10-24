import express from 'express';
import Badge from '../models/Badge.js';
import UserBadge from '../models/UserBadge.js';
import User from '../models/User.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { sequelize } from '../config/database.js';

const router = express.Router();

// Les modèles des badges n'étaient jamais initialisés : toutes les routes
// plantaient (« Cannot convert undefined or null to object »). Initialisés ici,
// tables créées au premier usage.
if (!Badge.sequelize) Badge.init(sequelize);
if (!UserBadge.sequelize) UserBadge.init(sequelize);
if (!UserBadge.associations?.badge) UserBadge.belongsTo(Badge, { foreignKey: 'badgeId', as: 'badge' });
let tablesPretes = null;
const preparerTables = () => (tablesPretes ||= Badge.sync().then(() => UserBadge.sync()).catch((e) => { tablesPretes = null; throw e; }));

// Toutes les routes nécessitent l'authentification et les privilèges admin
router.use(authenticate);
router.use(requireAdmin);
router.use(async (req, res, next) => {
  try { await preparerTables(); next(); }
  catch (e) { console.error('Tables des badges :', e.message); res.status(500).json({ success: false, message: 'Badges indisponibles pour le moment.' }); }
});

// @route   GET /api/admin/badges
// @desc    Récupérer tous les badges
// @access  Admin
router.get('/', async (req, res) => {
  try {
    const badges = await Badge.getAllBadges();
    
    res.json({
      success: true,
      badges: badges
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des badges:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des badges'
    });
  }
});

// @route   GET /api/admin/badges/categories/:category
// @desc    Récupérer les badges par catégorie
// @access  Admin
router.get('/categories/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const badges = await Badge.getBadgesByCategory(category);
    
    res.json({
      success: true,
      badges: badges
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des badges par catégorie:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des badges'
    });
  }
});

// @route   POST /api/admin/badges
// @desc    Créer un nouveau badge
// @access  Admin
router.post('/', async (req, res) => {
  try {
    const { name, description, icon, color, category, rarity, requirements } = req.body;
    
    if (!name || !description) {
      return res.status(400).json({
        success: false,
        message: 'Le nom et la description sont requis'
      });
    }

    const badgeData = {
      name,
      description,
      icon: icon || '🏆',
      color: color || '#FFD700',
      category: category || 'achievement',
      rarity: rarity || 'common',
      requirements: requirements || null,
      createdBy: req.user.numeroH
    };

    const badge = await Badge.createBadge(badgeData);
    
    res.status(201).json({
      success: true,
      message: 'Badge créé avec succès',
      badge: badge
    });
  } catch (error) {
    console.error('Erreur lors de la création du badge:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création du badge'
    });
  }
});

// @route   PUT /api/admin/badges/:id
// @desc    Mettre à jour un badge
// @access  Admin
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const badge = await Badge.updateBadge(id, updateData);
    
    res.json({
      success: true,
      message: 'Badge mis à jour avec succès',
      badge: badge
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du badge:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur lors de la mise à jour du badge'
    });
  }
});

// @route   DELETE /api/admin/badges/:id
// @desc    Supprimer un badge
// @access  Admin
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await Badge.deleteBadge(id);
    
    res.json({
      success: true,
      message: 'Badge supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du badge:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur lors de la suppression du badge'
    });
  }
});

// @route   POST /api/admin/badges/award
// @desc    Attribuer un badge à un utilisateur
// @access  Admin
router.post('/award', async (req, res) => {
  try {
    const { numeroH, badgeId, reason } = req.body;
    
    if (!numeroH || !badgeId) {
      return res.status(400).json({
        success: false,
        message: 'Le NumeroH et l\'ID du badge sont requis'
      });
    }

    // Vérifier que l'utilisateur existe
    const user = await User.findByNumeroH(numeroH);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier que le badge existe
    const badge = await Badge.findByPk(badgeId);
    if (!badge) {
      return res.status(404).json({
        success: false,
        message: 'Badge non trouvé'
      });
    }

    const userBadge = await UserBadge.awardBadge(numeroH, badgeId, req.user.numeroH, reason);
    
    res.status(201).json({
      success: true,
      message: `Badge "${badge.name}" attribué avec succès à ${user.prenom} ${user.nomFamille}`,
      userBadge: userBadge
    });
  } catch (error) {
    console.error('Erreur lors de l\'attribution du badge:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur lors de l\'attribution du badge'
    });
  }
});

// @route   DELETE /api/admin/badges/remove
// @desc    Retirer un badge d'un utilisateur
// @access  Admin
router.delete('/remove', async (req, res) => {
  try {
    const { numeroH, badgeId } = req.body;
    
    if (!numeroH || !badgeId) {
      return res.status(400).json({
        success: false,
        message: 'Le NumeroH et l\'ID du badge sont requis'
      });
    }

    await UserBadge.removeBadge(numeroH, badgeId);
    
    res.json({
      success: true,
      message: 'Badge retiré avec succès'
    });
  } catch (error) {
    console.error('Erreur lors du retrait du badge:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur lors du retrait du badge'
    });
  }
});

// @route   GET /api/admin/badges/user/:numeroH
// @desc    Récupérer les badges d'un utilisateur
// @access  Admin
router.get('/user/:numeroH', async (req, res) => {
  try {
    const { numeroH } = req.params;
    
    const userBadges = await UserBadge.getUserBadges(numeroH);
    
    res.json({
      success: true,
      badges: userBadges
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des badges utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des badges'
    });
  }
});

// @route   GET /api/admin/badges/stats
// @desc    Récupérer les statistiques des badges
// @access  Admin
router.get('/stats', async (req, res) => {
  try {
    const stats = await UserBadge.getBadgeStats();
    
    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des statistiques'
    });
  }
});

export default router;