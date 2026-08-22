import express from 'express';
import { Op } from 'sequelize';
import multer from 'multer';
import RegionGroup from '../models/RegionGroup.js';
import RegionMessage from '../models/RegionMessage.js';
import RegionMessagePermission from '../models/RegionMessagePermission.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import { extractHashtags } from '../utils/hashtags.js';
import { uploadToImageKit } from '../services/imagekitStorage.js';
import { uploadToR2 } from '../services/r2Storage.js';
import { uploadToIDrive } from '../services/idriveStorage.js';

const router = express.Router();

// Upload en mémoire pour les médias — jamais sur le disque du serveur
// (effacé à chaque redémarrage/redéploiement), envoyé ensuite vers le cloud.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
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

// @route   GET /api/regions/groups
// @desc    Récupérer les organisations de régions
// @access  Authentifié
router.get('/groups', async (req, res) => {
  try {
    const { region } = req.query;
    
    const where = { isActive: true };
    if (region) {
      where.region = region;
    }
    
    const groups = await RegionGroup.findAll({
      where,
      order: [['created_at', 'DESC']]
    });
    
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

// @route   POST /api/regions/groups
// @desc    Créer un nouveau organisation de région
// @access  Authentifié
router.post('/groups', async (req, res) => {
  try {
    const { name, description, region, createdBy } = req.body;
    
    const group = await RegionGroup.create({
      name,
      description,
      region,
      members: [createdBy || req.user.numeroH],
      posts: [],
      createdBy: createdBy || req.user.numeroH
    });
    
    res.status(201).json({
      success: true,
      group,
      message: 'Organisation créé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création du organisation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création du organisation'
    });
  }
});

// @route   POST /api/regions/groups/:id/join
// @desc    Rejoindre un organisation de région
// @access  Authentifié
router.post('/groups/:id/join', async (req, res) => {
  try {
    const { numeroH } = req.body;
    const group = await RegionGroup.findByPk(req.params.id);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Organisation non trouvé'
      });
    }
    
    const members = group.members || [];
    if (!members.includes(numeroH)) {
      members.push(numeroH);
      await group.update({ members });
    }
    
    res.json({
      success: true,
      message: 'Vous avez rejoint le organisation avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'adhésion au organisation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'adhésion au organisation'
    });
  }
});

// @route   POST /api/regions/groups/:id/posts
// @desc    Créer un post dans un organisation de région
// @access  Authentifié
router.post('/groups/:id/posts', async (req, res) => {
  try {
    const { content, type, author, authorName } = req.body;
    const group = await RegionGroup.findByPk(req.params.id);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Organisation non trouvé'
      });
    }
    
    const posts = group.posts || [];
    const newPost = {
      id: Date.now().toString(),
      author,
      authorName,
      content,
      type,
      likes: [],
      comments: [],
      createdAt: new Date().toISOString()
    };
    
    posts.push(newPost);
    await group.update({ posts });
    
    res.status(201).json({
      success: true,
      post: newPost,
      message: 'Post créé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création du post:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création du post'
    });
  }
});

// @route   GET /api/regions/groups/:id/messages
// @desc    Récupérer les messages d'un groupe
// @access  Authentifié
router.get('/groups/:id/messages', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const messages = await RegionMessage.getGroupMessages(req.params.id, parseInt(limit), parseInt(offset));
    
    // Récupérer les informations des utilisateurs
    const messagesWithUsers = await Promise.all(messages.map(async (msg) => {
      const user = await User.findOne({ where: { numero_h: msg.numeroH } });
      return {
        ...msg.toJSON(),
        authorName: user ? `${user.prenom} ${user.nom_famille}` : 'Utilisateur inconnu'
      };
    }));
    
    res.json({
      success: true,
      messages: messagesWithUsers
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des messages:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des messages'
    });
  }
});

// @route   POST /api/regions/groups/:id/messages
// @desc    Envoyer un message dans un groupe (WhatsApp style)
// @access  Authentifié avec permission
router.post('/groups/:id/messages', upload.single('media'), async (req, res) => {
  try {
    const group = await RegionGroup.findByPk(req.params.id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Groupe non trouvé'
      });
    }
    
    const numeroH = req.user.numeroH;
    const { content, messageType = 'text', category = 'information' } = req.body;
    
    // Vérifier si l'utilisateur est admin ou créateur du groupe
    const isAdmin = req.user.role === 'admin' || req.user.role === 'super-admin';
    const isCreator = group.createdBy === numeroH;
    
    // Vérifier si l'utilisateur est membre du groupe
    const members = group.members || [];
    const isMember = members.includes(numeroH);
    
    // Permettre à tous les membres de publier, ou vérifier la permission
    if (!isAdmin && !isCreator && !isMember) {
      // Si pas membre, vérifier la permission
      const hasPermission = await RegionMessagePermission.checkPermission(req.params.id, numeroH);
      if (!hasPermission) {
        // Ajouter automatiquement l'utilisateur au groupe
        members.push(numeroH);
        await group.update({ members });
      }
    } else if (!isMember) {
      // Ajouter automatiquement l'utilisateur au groupe
      members.push(numeroH);
      await group.update({ members });
    }
    
    // Validation
    if (messageType !== 'text' && !req.file) {
      return res.status(400).json({
        success: false,
        message: 'Un fichier média est requis pour ce type de message'
      });
    }
    
    if (messageType === 'text' && !content?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Le contenu du message est requis'
      });
    }
    
    let mediaUrl = null;
    if (req.file) {
      mediaUrl = req.file.mimetype.startsWith('image/')
        ? await uploadToImageKit(req.file.buffer, req.file.originalname, 'regions')
        : await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype, 'regions');
      uploadToIDrive(req.file.buffer, req.file.originalname, req.file.mimetype, 'regions').catch(() => {});
    }
    
    // Extraire les hashtags du contenu
    const hashtags = extractHashtags(content || '');
    
    const message = await RegionMessage.create({
      groupId: req.params.id,
      numeroH,
      messageType,
      category,
      content: content || '',
      mediaUrl,
      hashtags
    });
    
    const user = await User.findOne({ where: { numero_h: numeroH } });
    
    res.status(201).json({
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

// @route   GET /api/regions/groups/:id/permissions
// @desc    Récupérer les permissions d'un groupe
// @access  Authentifié (admin ou créateur)
router.get('/groups/:id/permissions', async (req, res) => {
  try {
    const group = await RegionGroup.findByPk(req.params.id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Groupe non trouvé'
      });
    }
    
    const numeroH = req.user.numeroH;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'super-admin';
    const isCreator = group.createdBy === numeroH;
    
    if (!isAdmin && !isCreator) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'avez pas la permission de voir les permissions'
      });
    }
    
    const permissions = await RegionMessagePermission.getGroupPermissions(req.params.id);
    
    // Récupérer les informations des utilisateurs
    const permissionsWithUsers = await Promise.all(permissions.map(async (perm) => {
      const user = await User.findOne({ where: { numero_h: perm.numeroH } });
      return {
        ...perm.toJSON(),
        userName: user ? `${user.prenom} ${user.nom_famille}` : 'Utilisateur inconnu',
        numeroH: user ? user.numero_h : perm.numeroH
      };
    }));
    
    res.json({
      success: true,
      permissions: permissionsWithUsers
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des permissions'
    });
  }
});

// @route   POST /api/regions/groups/:id/permissions
// @desc    Accorder une permission à un utilisateur
// @access  Authentifié (admin ou créateur)
router.post('/groups/:id/permissions', async (req, res) => {
  try {
    const group = await RegionGroup.findByPk(req.params.id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Groupe non trouvé'
      });
    }
    
    const numeroH = req.user.numeroH;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'super-admin';
    const isCreator = group.createdBy === numeroH;
    
    if (!isAdmin && !isCreator) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'avez pas la permission d\'accorder des permissions'
      });
    }
    
    const { targetNumeroH } = req.body;
    if (!targetNumeroH) {
      return res.status(400).json({
        success: false,
        message: 'Le NumeroH de l\'utilisateur est requis'
      });
    }
    
    const permission = await RegionMessagePermission.grantPermission(
      req.params.id,
      targetNumeroH,
      numeroH
    );
    
    res.status(201).json({
      success: true,
      permission,
      message: 'Permission accordée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'attribution de la permission:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'attribution de la permission'
    });
  }
});

// @route   DELETE /api/regions/groups/:id/permissions/:numeroH
// @desc    Révoquer une permission
// @access  Authentifié (admin ou créateur)
router.delete('/groups/:id/permissions/:numeroH', async (req, res) => {
  try {
    const group = await RegionGroup.findByPk(req.params.id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Groupe non trouvé'
      });
    }
    
    const numeroH = req.user.numeroH;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'super-admin';
    const isCreator = group.createdBy === numeroH;
    
    if (!isAdmin && !isCreator) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'avez pas la permission de révoquer des permissions'
      });
    }
    
    await RegionMessagePermission.revokePermission(req.params.id, req.params.numeroH);
    
    res.json({
      success: true,
      message: 'Permission révoquée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la révocation de la permission:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la révocation de la permission'
    });
  }
});

// @route   GET /api/regions/groups/:id/check-permission
// @desc    Vérifier si l'utilisateur a la permission d'envoyer des messages
// @access  Authentifié
router.get('/groups/:id/check-permission', async (req, res) => {
  try {
    const group = await RegionGroup.findByPk(req.params.id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Groupe non trouvé'
      });
    }
    
    const numeroH = req.user.numeroH;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'super-admin';
    const isCreator = group.createdBy === numeroH;
    
    let hasPermission = false;
    if (isAdmin || isCreator) {
      hasPermission = true;
    } else {
      hasPermission = await RegionMessagePermission.checkPermission(req.params.id, numeroH);
    }
    
    res.json({
      success: true,
      hasPermission,
      isAdmin,
      isCreator
    });
  } catch (error) {
    console.error('Erreur lors de la vérification de la permission:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la vérification de la permission'
    });
  }
});

export default router;








