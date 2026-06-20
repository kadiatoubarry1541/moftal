import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Op } from 'sequelize';
import ResidenceGroup from '../models/ResidenceGroup.js';
import ResidenceMessage from '../models/ResidenceMessage.js';
import User from '../models/User.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Normalise un nom de lieu : minuscule + sans accents → "TÉLIKO" = "teliko" = "Teliko"
function normalizeLoc(str) {
  if (!str) return '';
  return str.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Formate joliment pour l'affichage : "teliko" → "Teliko"
function formatDisplayName(str) {
  if (!str) return '';
  return str.trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// Configuration multer pour l'upload des médias
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/residences';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `residence-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers image, vidéo et audio sont autorisés'), false);
    }
  }
});

// Toutes les routes nécessitent l'authentification
router.use(authenticate);

// @route   GET /api/residences/groups
// @desc    Récupérer les organisations de lieux de résidence
// @access  Authentifié
router.get('/groups', async (req, res) => {
  try {
    const { location } = req.query;

    // Normaliser : minuscule + sans accents → "TÉLIKO" = "teliko" = "Téliko" → même groupe
    const normalizedLocation = location ? normalizeLoc(location) : null;

    const where = { isActive: true };
    if (normalizedLocation) {
      where.location = normalizedLocation;
    }

    let groups = await ResidenceGroup.findAll({
      where,
      order: [['created_at', 'DESC']]
    });

    // Créer automatiquement un groupe si le quartier n'existe pas encore
    if (normalizedLocation && groups.length === 0) {
      const displayName = formatDisplayName(location);
      const newGroup = await ResidenceGroup.create({
        location: normalizedLocation,
        title: displayName,
        description: '',
        admin: req.user.numeroH,
        members: [],
        createdBy: req.user.numeroH
      });
      groups = [newGroup];
    }

    res.json({
      success: true,
      groups
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des organisations:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des organisations'
    });
  }
});

// @route   POST /api/residences/groups
// @desc    Créer un nouveau organisation de lieu de résidence
// @access  Admin
router.post('/groups', requireAdmin, async (req, res) => {
  try {
    const { location, title, description, settings } = req.body;
    const normalizedLocation = location ? normalizeLoc(location) : location;

    const group = await ResidenceGroup.create({
      location: normalizedLocation,
      title,
      description,
      admin: req.user.numeroH,
      settings: settings ? JSON.parse(settings) : {},
      createdBy: req.user.numeroH
    });
    
    res.json({
      success: true,
      message: 'Organisation créé avec succès',
      group
    });
  } catch (error) {
    console.error('Erreur lors de la création du organisation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création du organisation'
    });
  }
});

// @route   POST /api/residences/groups/:id/join
// @desc    Rejoindre un organisation de lieu de résidence
// @access  Authentifié
router.post('/groups/:id/join', async (req, res) => {
  try {
    const { id } = req.params;
    
    const group = await ResidenceGroup.findByPk(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Organisation non trouvé'
      });
    }
    
    if (!group.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Ce organisation n\'est plus actif'
      });
    }
    
    const members = group.members || [];
    if (members.includes(req.user.numeroH)) {
      return res.status(400).json({
        success: false,
        message: 'Vous êtes déjà membre de ce organisation'
      });
    }
    
    members.push(req.user.numeroH);
    await group.update({ members });
    
    res.json({
      success: true,
      message: 'Vous avez rejoint le organisation avec succès',
      group
    });
  } catch (error) {
    console.error('Erreur lors de l\'adhésion au organisation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'adhésion au organisation'
    });
  }
});

// @route   POST /api/residences/groups/:id/messages
// @desc    Envoyer un message dans un organisation de lieu de résidence
// @access  Authentifié
router.post('/groups/:id/messages', upload.single('media'), async (req, res) => {
  try {
    const { id } = req.params;
    const { content, messageType, category = 'information' } = req.body;
    
    const group = await ResidenceGroup.findByPk(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Organisation non trouvé'
      });
    }
    
    const members = group.members || [];
    // Ajouter automatiquement l'utilisateur s'il n'est pas membre
    if (!members.includes(req.user.numeroH)) {
      members.push(req.user.numeroH);
      await group.update({ members });
    }
    
    const messageData = {
      groupId: id,
      numeroH: req.user.numeroH,
      messageType: messageType || 'text',
      category,
      content
    };
    
    if (req.file) {
      messageData.mediaUrl = `/uploads/residences/${req.file.filename}`;
    }
    
    const message = await ResidenceMessage.create(messageData);
    
    const user = await User.findOne({ where: { numero_h: req.user.numeroH } });
    
    res.json({
      success: true,
      message: {
        ...message.toJSON(),
        authorName: user ? `${user.prenom} ${user.nom_famille}` : 'Utilisateur inconnu'
      }
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi du message:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'envoi du message'
    });
  }
});

// @route   GET /api/residences/groups/:id/messages
// @desc    Récupérer les messages d'un organisation de lieu de résidence
// @access  Authentifié
router.get('/groups/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const group = await ResidenceGroup.findByPk(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Organisation non trouvé'
      });
    }
    
    const members = group.members || [];

    const isAdminUser =
      req.user &&
      (
        req.user.role === 'admin' ||
        req.user.role === 'super-admin' ||
        req.user.isMasterAdmin ||
        req.user.canViewAll
      );

    // Les utilisateurs classiques doivent être membres du groupe.
    // Les administrateurs (admin, super-admin, master admin) peuvent voir tous les messages
    // sans condition d'appartenance, afin de mieux superviser la plateforme.
    if (!isAdminUser && !members.includes(req.user.numeroH)) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas membre de ce organisation'
      });
    }

    const messages = await ResidenceMessage.getGroupMessages(id, parseInt(limit), parseInt(offset));

    // Ajouter les noms des auteurs
    const messagesWithAuthors = await Promise.all(
      messages.map(async (msg) => {
        const user = await User.findOne({ where: { numero_h: msg.numeroH } });
        return {
          ...msg.toJSON(),
          authorName: user ? `${user.prenom} ${user.nom_famille}` : 'Utilisateur inconnu'
        };
      })
    );

    res.json({
      success: true,
      messages: messagesWithAuthors
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des messages:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des messages'
    });
  }
});

// @route   GET /api/residences/stats
// @desc    Récupérer les statistiques des lieux de résidence
// @access  Admin
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await ResidenceGroup.getLocationStats();
    
    res.json({
      success: true,
      stats
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


