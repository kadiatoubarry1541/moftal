import express from 'express';
import Logo from '../models/Logo.js';
import UserLogo from '../models/UserLogo.js';
import User from '../models/User.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/logos/public/:numeroH
// @desc    Récupérer les logos d'un utilisateur quelconque — route publique visible par tous
// @access  Authentifié (lecture seule)
router.get('/public/:numeroH', authenticate, async (req, res) => {
  try {
    const { numeroH } = req.params;
    const userLogos = await UserLogo.findAll({
      where: { numeroH },
      include: [{ model: Logo, as: 'logo', where: { isActive: true }, required: true }],
      order: [['assignedAt', 'DESC']]
    });
    res.json({ success: true, logos: userLogos });
  } catch (error) {
    console.error('Erreur logos public:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Route publique pour récupérer ses propres logos (avant requireAdmin)
// @route   GET /api/logos/my-logos
// @desc    Récupérer les logos de l'utilisateur connecté
// @access  Authentifié
router.get('/my-logos', authenticate, async (req, res) => {
  try {
    const numeroH = req.user.numeroH;
    
    const userLogos = await UserLogo.findAll({
      where: { numeroH },
      include: [{
        model: Logo,
        as: 'logo'
      }],
      order: [['assignedAt', 'DESC']]
    });
    
    res.json({
      success: true,
      logos: userLogos
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des logos utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des logos'
    });
  }
});

// Toutes les autres routes nécessitent l'authentification et les privilèges admin
router.use(authenticate);
router.use(requireAdmin);

// @route   GET /api/logos
// @desc    Récupérer tous les logos
// @access  Admin
router.get('/', async (req, res) => {
  try {
    const logos = await Logo.findAll({
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      logos: logos
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des logos:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des logos'
    });
  }
});

// @route   GET /api/logos/categories/:category
// @desc    Récupérer les logos par catégorie
// @access  Admin
router.get('/categories/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const logos = await Logo.findAll({
      where: { category },
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      logos: logos
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des logos par catégorie:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des logos'
    });
  }
});

// @route   POST /api/logos
// @desc    Créer un nouveau logo
// @access  Admin
router.post('/', async (req, res) => {
  try {
    const { name, description, icon, color, category } = req.body;
    
    if (!name || !description) {
      return res.status(400).json({
        success: false,
        message: 'Le nom et la description sont requis'
      });
    }

    const logoData = {
      name,
      description,
      icon: icon || '👤',
      color: color || '#3B82F6',
      category: category || 'personal',
      isActive: true,
      createdBy: req.user.numeroH,
      usageCount: 0
    };

    const logo = await Logo.create(logoData);
    
    res.status(201).json({
      success: true,
      message: 'Logo créé avec succès',
      logo: logo
    });
  } catch (error) {
    console.error('Erreur lors de la création du logo:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création du logo'
    });
  }
});

// @route   PUT /api/logos/:id
// @desc    Mettre à jour un logo
// @access  Admin
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const logo = await Logo.findByPk(id);
    if (!logo) {
      return res.status(404).json({
        success: false,
        message: 'Logo non trouvé'
      });
    }

    await logo.update(updateData);
    
    res.json({
      success: true,
      message: 'Logo mis à jour avec succès',
      logo: logo
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du logo:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur lors de la mise à jour du logo'
    });
  }
});

// @route   DELETE /api/logos/:id
// @desc    Supprimer un logo
// @access  Admin
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const logo = await Logo.findByPk(id);
    if (!logo) {
      return res.status(404).json({
        success: false,
        message: 'Logo non trouvé'
      });
    }

    await logo.destroy();
    
    res.json({
      success: true,
      message: 'Logo supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du logo:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur lors de la suppression du logo'
    });
  }
});

// @route   POST /api/logos/:id/assign
// @desc    Assigner un logo à un utilisateur
// @access  Admin
router.post('/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;
    const { numeroH, note } = req.body;

    if (!numeroH) {
      return res.status(400).json({
        success: false,
        message: 'Le NumeroH est requis'
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

    // Vérifier que le logo existe
    const logo = await Logo.findByPk(id);
    if (!logo) {
      return res.status(404).json({
        success: false,
        message: 'Logo non trouvé'
      });
    }

    // Vérifier si l'utilisateur a déjà ce logo
    const existingUserLogo = await UserLogo.findOne({
      where: { numeroH, logoId: id }
    });

    if (existingUserLogo) {
      return res.status(400).json({
        success: false,
        message: 'L\'utilisateur a déjà ce logo'
      });
    }

    // Vérifier le nombre maximum de logos (limite à 3)
    const userLogoCount = await UserLogo.count({
      where: { numeroH }
    });

    if (userLogoCount >= 3) {
      return res.status(400).json({
        success: false,
        message: 'L\'utilisateur a déjà atteint la limite de 3 logos. Veuillez retirer un logo existant avant d\'en ajouter un nouveau.'
      });
    }

    // Créer l'association
    const userLogo = await UserLogo.create({
      numeroH,
      logoId: id,
      assignedBy: req.user.numeroH,
      note: note || null,
      assignedAt: new Date()
    });

    // Incrémenter le compteur d'utilisation
    await logo.increment('usageCount');
    
    res.status(201).json({
      success: true,
      message: `Logo "${logo.name}" assigné avec succès à ${user.prenom} ${user.nomFamille}`,
      userLogo: userLogo
    });
  } catch (error) {
    console.error('Erreur lors de l\'assignation du logo:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur lors de l\'assignation du logo'
    });
  }
});

// @route   DELETE /api/logos/:id/remove
// @desc    Retirer un logo d'un utilisateur
// @access  Admin
router.delete('/:id/remove', async (req, res) => {
  try {
    const { id } = req.params;
    const { numeroH } = req.body;
    
    if (!numeroH) {
      return res.status(400).json({
        success: false,
        message: 'Le NumeroH est requis'
      });
    }

    const userLogo = await UserLogo.findOne({
      where: { numeroH, logoId: id }
    });

    if (!userLogo) {
      return res.status(404).json({
        success: false,
        message: 'Association logo-utilisateur non trouvée'
      });
    }

    await userLogo.destroy();

    // Décrémenter le compteur d'utilisation
    const logo = await Logo.findByPk(id);
    if (logo && logo.usageCount > 0) {
      await logo.decrement('usageCount');
    }
    
    res.json({
      success: true,
      message: 'Logo retiré avec succès'
    });
  } catch (error) {
    console.error('Erreur lors du retrait du logo:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur lors du retrait du logo'
    });
  }
});

// @route   GET /api/logos/user/:numeroH
// @desc    Récupérer les logos d'un utilisateur
// @access  Admin ou utilisateur lui-même
router.get('/user/:numeroH', async (req, res) => {
  try {
    const { numeroH } = req.params;
    
    // Vérifier que l'utilisateur récupère ses propres logos ou qu'il est admin
    const user = req.user;
    if (!user || (user.numeroH !== numeroH && user.role !== 'admin')) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }
    
    const userLogos = await UserLogo.findAll({
      where: { numeroH },
      include: [{
        model: Logo,
        as: 'logo'
      }],
      order: [['assignedAt', 'DESC']]
    });
    
    res.json({
      success: true,
      logos: userLogos
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des logos utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des logos'
    });
  }
});

// @route   GET /api/logos/stats
// @desc    Récupérer les statistiques des logos
// @access  Admin
router.get('/stats', async (req, res) => {
  try {
    const totalLogos = await Logo.count();
    const activeLogos = await Logo.count({ where: { isActive: true } });
    const totalAssignments = await UserLogo.count();
    
    const logosByCategory = await Logo.findAll({
      attributes: ['category', [Logo.sequelize.fn('COUNT', Logo.sequelize.col('id')), 'count']],
      group: ['category'],
      raw: true
    });
    
    res.json({
      success: true,
      stats: {
        totalLogos,
        activeLogos,
        totalAssignments,
        logosByCategory
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des statistiques'
    });
  }
});

// @route   POST /api/logos/bulk-import
// @desc    Importer en masse des logos professionnels
// @access  Admin
router.post('/bulk-import', async (req, res) => {
  try {
    const { logos } = req.body;
    
    if (!Array.isArray(logos) || logos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Une liste de logos est requise'
      });
    }

    const createdLogos = [];
    const errors = [];

    for (const logoData of logos) {
      try {
        const { name, description, icon, color, category } = logoData;
        
        if (!name || !description) {
          errors.push({ logo: logoData, error: 'Le nom et la description sont requis' });
          continue;
        }

        // Vérifier si le logo existe déjà
        const existingLogo = await Logo.findOne({ where: { name } });
        if (existingLogo) {
          errors.push({ logo: logoData, error: `Le logo "${name}" existe déjà` });
          continue;
        }

        const logo = await Logo.create({
          name,
          description,
          icon: icon || '💼',
          color: color || '#3B82F6',
          category: category || 'profession',
          isActive: true,
          createdBy: req.user.numeroH,
          usageCount: 0
        });

        createdLogos.push(logo);
      } catch (error) {
        errors.push({ logo: logoData, error: error.message });
      }
    }

    res.status(201).json({
      success: true,
      message: `${createdLogos.length} logo(s) créé(s) avec succès`,
      created: createdLogos.length,
      failed: errors.length,
      logos: createdLogos,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Erreur lors de l\'import en masse:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'import en masse'
    });
  }
});

export default router;
