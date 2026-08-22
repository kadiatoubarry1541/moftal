import express from 'express';
import multer from 'multer';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import SciencePost from '../models/SciencePost.js';
import SciencePermission from '../models/SciencePermission.js';
import User from '../models/User.js';
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
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers image, vidéo, audio et PDF sont autorisés'), false);
    }
  }
});

// Toutes les routes nécessitent l'authentification
router.use(authenticate);

// Middleware pour vérifier les permissions de publication
const canPublish = async (req, res, next) => {
  try {
    const user = req.user;
    
    // L'admin peut toujours publier
    // On aligne ici avec la logique du frontend qui considère
    // à la fois le NumeroH "G0..." et éventuellement "G7..." comme comptes spéciaux.
    if (
      user.role === 'admin' ||
      user.role === 'super-admin' ||
      user.numeroH === 'G7C7P7R7E7F7 7' ||
      user.numeroH === 'G0C0P0R0E0F0 0'
    ) {
      return next();
    }
    
    // Vérifier si l'utilisateur a la permission de publier
    const hasPermission = await SciencePermission.checkPermission(user.numeroH);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'avez pas la permission de publier. Contactez un administrateur.'
      });
    }
    
    next();
  } catch (error) {
    console.error('Erreur lors de la vérification des permissions:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la vérification des permissions'
    });
  }
};

// ========== GESTION DES POSTS ==========

// @route   GET /api/science/posts
// @desc    Récupérer les posts scientifiques
// @access  Authentifié
router.get('/posts', async (req, res) => {
  try {
    const { category } = req.query;
    
    let posts;
    if (category) {
      posts = await SciencePost.getPostsByCategory(category);
    } else {
      posts = await SciencePost.getAllPosts();
    }
    
    res.json({
      success: true,
      posts
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des posts:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des posts'
    });
  }
});

// Middleware pour gérer les erreurs multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Le fichier est trop volumineux. Taille maximale: 100MB'
      });
    }
    return res.status(400).json({
      success: false,
      message: `Erreur d'upload: ${err.message}`
    });
  }
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Erreur lors de l\'upload du fichier'
    });
  }
  next();
};

// @route   POST /api/science/create-post
// @desc    Créer un nouveau post scientifique
// @access  Admin ou Utilisateur autorisé
router.post('/create-post', canPublish, upload.single('media'), handleMulterError, async (req, res) => {
  try {
    const { title, content, type, category, author, authorName } = req.body;
    
    console.log('Création de post Science:', {
      title,
      type,
      category,
      hasFile: !!req.file,
      fileInfo: req.file ? {
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : null
    });
    
    // Validation améliorée
    if (type === 'image' || type === 'video' || type === 'audio') {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: `Un fichier ${type === 'image' ? 'photo' : type === 'video' ? 'vidéo' : 'audio'} est requis pour ce type de post`
        });
      }
    }
    
    if (type === 'text' && !title && !content) {
      return res.status(400).json({
        success: false,
        message: 'Au moins le titre ou le contenu est requis pour un post texte'
      });
    }
    
    const postData = {
      title: title || 'Sans titre',
      content: content || '',
      type: type || 'text',
      category: category || 'recentes',
      author: author || req.user.numeroH,
      authorName: authorName || `${req.user.prenom} ${req.user.nomFamille}`
    };
    
    if (req.file) {
      postData.mediaUrl = req.file.mimetype.startsWith('image/')
        ? await uploadToImageKit(req.file.buffer, req.file.originalname, 'science')
        : await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype, 'science');
      uploadToIDrive(req.file.buffer, req.file.originalname, req.file.mimetype, 'science').catch(() => {});
      console.log('URL média créée:', postData.mediaUrl);
    }
    
    const post = await SciencePost.create(postData);
    console.log('Post créé avec succès:', post.id);
    
    res.json({
      success: true,
      message: 'Post créé avec succès',
      post
    });
  } catch (error) {
    console.error('Erreur lors de la création du post:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur lors de la création du post',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ========== GESTION DES PERMISSIONS ==========

// @route   POST /api/science/permissions
// @desc    Accorder une permission de publication à un utilisateur
// @access  Admin uniquement
router.post('/permissions', requireAdmin, async (req, res) => {
  try {
    const { numeroH, expiresAt, notes } = req.body;
    const user = req.user;

    if (!numeroH) {
      return res.status(400).json({
        success: false,
        message: 'NumeroH est requis'
      });
    }

    // Vérifier que l'utilisateur existe
    const targetUser = await User.findByNumeroH(numeroH);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier si la permission existe déjà
    const existingPermission = await SciencePermission.findOne({
      where: { numeroH, isActive: true }
    });

    if (existingPermission) {
      return res.status(400).json({
        success: false,
        message: 'Cette permission existe déjà'
      });
    }

    const permission = await SciencePermission.create({
      numeroH,
      isActive: true,
      grantedBy: user.numeroH,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      notes
    });

    res.status(201).json({
      success: true,
      message: 'Permission accordée avec succès',
      permission
    });
  } catch (error) {
    console.error('Erreur lors de l\'octroi de permission:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'octroi de permission'
    });
  }
});

// @route   GET /api/science/permissions
// @desc    Récupérer les permissions de publication
// @access  Admin uniquement
router.get('/permissions', requireAdmin, async (req, res) => {
  try {
    const { numeroH } = req.query;
    
    let where = {};
    if (numeroH) {
      where.numeroH = numeroH;
    }
    
    const permissions = await SciencePermission.findAll({
      where,
      order: [['created_at', 'DESC']]
    });
    
    res.json({
      success: true,
      permissions
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des permissions'
    });
  }
});

// @route   GET /api/science/my-permission
// @desc    Récupérer la permission de publication de l'utilisateur
// @access  Authentifié
router.get('/my-permission', async (req, res) => {
  try {
    const hasPermission = await SciencePermission.checkPermission(req.user.numeroH);
    
    res.json({
      success: true,
      hasPermission
    });
  } catch (error) {
    console.error('Erreur lors de la vérification de la permission:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la vérification de la permission'
    });
  }
});

// @route   DELETE /api/science/permissions/:permissionId
// @desc    Révoquer une permission de publication
// @access  Admin uniquement
router.delete('/permissions/:permissionId', requireAdmin, async (req, res) => {
  try {
    const { permissionId } = req.params;
    
    const permission = await SciencePermission.findByPk(permissionId);
    if (!permission) {
      return res.status(404).json({
        success: false,
        message: 'Permission non trouvée'
      });
    }
    
    permission.isActive = false;
    await permission.save();
    
    res.json({
      success: true,
      message: 'Permission révoquée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la révocation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la révocation'
    });
  }
});

export default router;

