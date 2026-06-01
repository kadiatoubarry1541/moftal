import express from 'express';
import PageAdmin from '../models/PageAdmin.js';
import User from '../models/User.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { sequelize } from '../config/database.js';
import { SECTOR_PAGE_PATHS } from '../utils/sectorAdmin.js';

// Initialiser le modèle PageAdmin
PageAdmin.init(sequelize);

const router = express.Router();

// Route publique pour récupérer l'admin d'une page (avant requireAdmin)
// @route   GET /api/page-admins/page/:pagePath
// @desc    Récupérer les admins d'une page spécifique (jusqu'à 2 chefs)
// @access  Public
router.get('/page/:pagePath', async (req, res) => {
  try {
    const { pagePath } = req.params;
    
    const pageAdmins = await PageAdmin.findAll({
      where: { 
        pagePath: pagePath.startsWith('/') ? pagePath : `/${pagePath}`,
        isActive: true 
      },
      include: [{
        model: User,
        as: 'admin',
        attributes: ['numeroH', 'prenom', 'nomFamille', 'photo']
      }],
      order: [['assignedAt', 'ASC']], // Premier chef assigné en premier
      limit: 2 // Maximum 2 chefs
    });
    
    res.json({
      success: true,
      pageAdmins: pageAdmins || [],
      pageAdmin: pageAdmins.length > 0 ? pageAdmins[0] : null // Pour compatibilité
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'admin de page:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération de l\'admin de page'
    });
  }
});

// Routes protégées par authentification (sans exiger admin)
router.use(authenticate);

// @route   GET /api/page-admins/my-sectors
// @desc    Secteurs que l'utilisateur gère (admin de page santé, éducation, échanges)
// @access  Authentifié
router.get('/my-sectors', async (req, res) => {
  try {
    const rows = await PageAdmin.findAll({
      where: {
        adminNumeroH: req.user.numeroH,
        pagePath: Object.values(SECTOR_PAGE_PATHS),
        isActive: true
      },
      attributes: ['pagePath', 'pageName']
    });
    const sectors = (rows || []).map(r => {
      const path = r.get ? r.get('pagePath') : r.pagePath;
      const name = r.get ? r.get('pageName') : r.pageName;
      const sector = Object.entries(SECTOR_PAGE_PATHS).find(([, p]) => p === path)?.[0] || path;
      return { sector, pagePath: path, pageName: name || path };
    });
    res.json({ success: true, sectors });
  } catch (e) {
    console.error('Erreur my-sectors:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Toutes les autres routes nécessitent admin
router.use(requireAdmin);

// @route   GET /api/page-admins
// @desc    Récupérer tous les admins de page
// @access  Admin
router.get('/', async (req, res) => {
  try {
    const pageAdmins = await PageAdmin.findAll({
      include: [{
        model: User,
        as: 'admin',
        attributes: ['numeroH', 'prenom', 'nomFamille', 'photo']
      }],
      order: [['pagePath', 'ASC'], ['assignedAt', 'DESC']]
    });
    
    res.json({
      success: true,
      pageAdmins: pageAdmins
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des admins de page:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des admins de page'
    });
  }
});

// @route   POST /api/page-admins
// @desc    Assigner un admin à une page. Secteurs santé/éducation/échanges : super-admin uniquement.
// @access  Admin (super-admin pour /sante, /education, /echange)
router.post('/', async (req, res) => {
  try {
    const { pagePath, pageName, adminNumeroH } = req.body;
    
    if (!pagePath || !pageName || !adminNumeroH) {
      return res.status(400).json({
        success: false,
        message: 'Le pagePath, pageName et adminNumeroH sont requis'
      });
    }

    const normalizedPath = pagePath.startsWith('/') ? pagePath : `/${pagePath}`;
    const isSectorPage = Object.values(SECTOR_PAGE_PATHS).includes(normalizedPath);
    if (
      isSectorPage &&
      req.user.role !== 'super-admin' &&
      req.user.numeroH !== 'G7C7P7R7E7F7 7' &&
      req.user.numeroH !== 'G0C0P0R0E0F0 0'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Seul l\'administrateur général peut créer ou approuver un admin de secteur (santé, éducation, échanges).'
      });
    }

    // Vérifier que l'utilisateur existe
    const user = await User.findByNumeroH(adminNumeroH);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier si cet utilisateur est déjà chef de cette page
    const existingUserAdmin = await PageAdmin.findOne({
      where: { 
        pagePath: pagePath.startsWith('/') ? pagePath : `/${pagePath}`,
        adminNumeroH: adminNumeroH,
        isActive: true 
      }
    });

    if (existingUserAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Cet utilisateur est déjà chef de cette page'
      });
    }

    // Vérifier le nombre de chefs actifs pour cette page (limite à 2)
    const activeAdminsCount = await PageAdmin.count({
      where: { 
        pagePath: pagePath.startsWith('/') ? pagePath : `/${pagePath}`,
        isActive: true 
      }
    });

    if (activeAdminsCount >= 2) {
      return res.status(400).json({
        success: false,
        message: 'Cette page a déjà atteint la limite de 2 chefs. Veuillez retirer un chef existant avant d\'en ajouter un nouveau.'
      });
    }

    // Créer le nouvel admin de page
    const pageAdmin = await PageAdmin.create({
      pagePath: pagePath.startsWith('/') ? pagePath : `/${pagePath}`,
      pageName,
      adminNumeroH,
      assignedBy: req.user.numeroH,
      isActive: true
    });
    
    res.status(201).json({
      success: true,
      message: `${user.prenom} ${user.nomFamille} est maintenant l'admin de la page "${pageName}"`,
      pageAdmin: pageAdmin
    });
  } catch (error) {
    console.error('Erreur lors de l\'assignation de l\'admin de page:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur lors de l\'assignation de l\'admin de page'
    });
  }
});

// @route   DELETE /api/page-admins/:id
// @desc    Retirer un admin d'une page. Secteurs : super-admin uniquement.
// @access  Admin (super-admin pour /sante, /education, /echange)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const pageAdmin = await PageAdmin.findByPk(id);
    if (!pageAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Admin de page non trouvé'
      });
    }

    const pathKey = 'pagePath';
    const pagePathValue = pageAdmin.get ? pageAdmin.get(pathKey) : pageAdmin[pathKey];
    const isSectorPage = pagePathValue && Object.values(SECTOR_PAGE_PATHS).includes(pagePathValue);
    if (
      isSectorPage &&
      req.user.role !== 'super-admin' &&
      req.user.numeroH !== 'G7C7P7R7E7F7 7' &&
      req.user.numeroH !== 'G0C0P0R0E0F0 0'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Seul l\'administrateur général peut retirer un admin de secteur.'
      });
    }

    await pageAdmin.update({ isActive: false });
    
    res.json({
      success: true,
      message: 'Admin de page retiré avec succès'
    });
  } catch (error) {
    console.error('Erreur lors du retrait de l\'admin de page:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur lors du retrait de l\'admin de page'
    });
  }
});

export default router;

