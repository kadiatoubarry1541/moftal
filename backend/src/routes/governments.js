import express from 'express';
import Government from '../models/Government.js';
import GovernmentMember from '../models/GovernmentMember.js';
import User from '../models/User.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { sequelize } from '../config/database.js';

// Initialiser les modèles
Government.init(sequelize);
GovernmentMember.init(sequelize);

const router = express.Router();

// Route publique pour récupérer les gouvernements actifs (avant requireAdmin)
// @route   GET /api/governments
// @desc    Récupérer tous les gouvernements actifs
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { country, region, active } = req.query;
    const where = {};
    
    if (country) where.country = country;
    if (region) where.region = region;
    if (active !== undefined) where.isActive = active === 'true';
    else where.isActive = true; // Par défaut, seulement les actifs
    
    const governments = await Government.findAll({
      where,
      include: [{
        model: User,
        as: 'president',
        attributes: ['numeroH', 'prenom', 'nomFamille', 'photo']
      }],
      order: [['startDate', 'DESC']]
    });
    
    res.json({
      success: true,
      governments: governments
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des gouvernements:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des gouvernements'
    });
  }
});

// @route   GET /api/governments/:id
// @desc    Récupérer un gouvernement avec ses membres
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const government = await Government.findByPk(id, {
      include: [
        {
          model: User,
          as: 'president',
          attributes: ['numeroH', 'prenom', 'nomFamille', 'photo']
        },
        {
          model: GovernmentMember,
          as: 'members',
          where: { isActive: true },
          required: false,
          include: [{
            model: User,
            as: 'member',
            attributes: ['numeroH', 'prenom', 'nomFamille', 'photo']
          }],
          order: [['rank', 'ASC'], ['role', 'ASC']]
        }
      ]
    });
    
    if (!government) {
      return res.status(404).json({
        success: false,
        message: 'Gouvernement non trouvé'
      });
    }
    
    res.json({
      success: true,
      government: government
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du gouvernement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération du gouvernement'
    });
  }
});

// Toutes les autres routes nécessitent l'authentification et les privilèges admin
router.use(authenticate);
router.use(requireAdmin);

// @route   POST /api/governments
// @desc    Créer un nouveau gouvernement
// @access  Admin
router.post('/', async (req, res) => {
  try {
    const { name, country, region, presidentNumeroH, startDate, description } = req.body;
    
    if (!name || !country || !presidentNumeroH) {
      return res.status(400).json({
        success: false,
        message: 'Le nom, le pays et le NumeroH du président sont requis'
      });
    }

    // Vérifier que le président existe
    const president = await User.findByNumeroH(presidentNumeroH);
    if (!president) {
      return res.status(404).json({
        success: false,
        message: 'Président non trouvé'
      });
    }

    // Vérifier si le président a déjà un gouvernement actif
    const existingGovernment = await Government.findOne({
      where: { 
        presidentNumeroH,
        isActive: true 
      }
    });

    if (existingGovernment) {
      return res.status(400).json({
        success: false,
        message: 'Ce président a déjà un gouvernement actif. Veuillez d\'abord désactiver l\'ancien gouvernement.'
      });
    }

    // Créer le gouvernement
    const government = await Government.create({
      name,
      country,
      region,
      presidentNumeroH,
      startDate: startDate || new Date(),
      description,
      isActive: true,
      createdBy: req.user.numeroH
    });
    
    res.status(201).json({
      success: true,
      message: `Gouvernement "${name}" créé avec succès`,
      government: government
    });
  } catch (error) {
    console.error('Erreur lors de la création du gouvernement:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur lors de la création du gouvernement'
    });
  }
});

// @route   POST /api/governments/:id/members
// @desc    Ajouter un membre au gouvernement
// @access  Admin
router.post('/:id/members', async (req, res) => {
  try {
    const { id } = req.params;
    const { memberNumeroH, role, ministry, rank } = req.body;
    
    if (!memberNumeroH || !role) {
      return res.status(400).json({
        success: false,
        message: 'Le NumeroH du membre et son rôle sont requis'
      });
    }

    // Vérifier que le gouvernement existe
    const government = await Government.findByPk(id);
    if (!government) {
      return res.status(404).json({
        success: false,
        message: 'Gouvernement non trouvé'
      });
    }

    // Vérifier que le membre existe
    const member = await User.findByNumeroH(memberNumeroH);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Membre non trouvé'
      });
    }

    // Vérifier si ce membre est déjà dans ce gouvernement
    const existingMember = await GovernmentMember.findOne({
      where: { 
        governmentId: id,
        memberNumeroH,
        isActive: true 
      }
    });

    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: 'Ce membre fait déjà partie de ce gouvernement'
      });
    }

    // Ajouter le membre
    const governmentMember = await GovernmentMember.create({
      governmentId: id,
      memberNumeroH,
      role,
      ministry: ministry || null,
      rank: rank || 99,
      appointedDate: new Date(),
      isActive: true
    });
    
    res.status(201).json({
      success: true,
      message: `${member.prenom} ${member.nomFamille} a été ajouté au gouvernement en tant que "${role}"`,
      member: governmentMember
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout du membre:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur lors de l\'ajout du membre'
    });
  }
});

// @route   DELETE /api/governments/:id/members/:memberId
// @desc    Retirer un membre du gouvernement
// @access  Admin
router.delete('/:id/members/:memberId', async (req, res) => {
  try {
    const { id, memberId } = req.params;
    
    const member = await GovernmentMember.findOne({
      where: { 
        id: memberId,
        governmentId: id 
      }
    });
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Membre non trouvé'
      });
    }

    await member.update({ isActive: false });
    
    res.json({
      success: true,
      message: 'Membre retiré du gouvernement avec succès'
    });
  } catch (error) {
    console.error('Erreur lors du retrait du membre:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur lors du retrait du membre'
    });
  }
});

// @route   PUT /api/governments/:id
// @desc    Mettre à jour un gouvernement
// @access  Admin
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, country, region, startDate, endDate, description, isActive } = req.body;
    
    const government = await Government.findByPk(id);
    if (!government) {
      return res.status(404).json({
        success: false,
        message: 'Gouvernement non trouvé'
      });
    }

    await government.update({
      name: name || government.name,
      country: country || government.country,
      region: region !== undefined ? region : government.region,
      startDate: startDate || government.startDate,
      endDate: endDate !== undefined ? endDate : government.endDate,
      description: description !== undefined ? description : government.description,
      isActive: isActive !== undefined ? isActive : government.isActive
    });
    
    res.json({
      success: true,
      message: 'Gouvernement mis à jour avec succès',
      government: government
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du gouvernement:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur lors de la mise à jour du gouvernement'
    });
  }
});

export default router;

