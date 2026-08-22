import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import RealityPost from '../models/RealityPost.js';
import { uploadToImageKit } from '../services/imagekitStorage.js';
import { uploadToR2 } from '../services/r2Storage.js';
import { uploadToIDrive } from '../services/idriveStorage.js';

const router = express.Router();

// Upload en mémoire pour les médias — jamais sur le disque du serveur
// (effacé à chaque redémarrage/redéploiement), envoyé ensuite vers le cloud.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype.startsWith('image/') ||
      file.mimetype.startsWith('video/') ||
      file.mimetype.startsWith('audio/') ||
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'image/jfif'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Fichier non supporté'), false);
    }
  }
});

// Toutes les routes nécessitent l'authentification
router.use(authenticate);

// ========== GESTION DES POSTS ==========

// @route   GET /api/reality/posts
// @desc    Récupérer les posts de santé
// @access  Authentifié
router.get('/posts', async (req, res) => {
  try {
    const { category, type } = req.query;
    
    let posts;
    if (category) {
      posts = await RealityPost.getPostsByCategory(category);
    } else if (type) {
      posts = await RealityPost.getPostsByType(type);
    } else {
      posts = await RealityPost.getAllPosts();
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

// @route   POST /api/reality/create-post
// @desc    Créer un nouveau post de santé (Admin uniquement)
// @access  Admin uniquement
router.post('/create-post', upload.single('media'), async (req, res) => {
  try {
    const { title, content, type, category, author, authorName } = req.body;
    
    if (!title && !content && !req.file) {
      return res.status(400).json({
        success: false,
        message: 'Au moins le titre, le contenu ou un média est requis'
      });
    }
    
    const postData = {
      title: title || 'Sans titre',
      content: content || '',
      type: type || 'text',
      category: category || 'message',
      author: author || req.user.numeroH,
      authorName: authorName || `${req.user.prenom} ${req.user.nomFamille}`
    };
    
    if (req.file) {
      postData.mediaUrl = req.file.mimetype.startsWith('image/')
        ? await uploadToImageKit(req.file.buffer, req.file.originalname, 'reality')
        : await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype, 'reality');
      uploadToIDrive(req.file.buffer, req.file.originalname, req.file.mimetype, 'reality').catch(() => {});
    }
    
    const post = await RealityPost.create(postData);
    
    res.json({
      success: true,
      message: 'Post créé avec succès',
      post
    });
  } catch (error) {
    console.error('Erreur lors de la création du post:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création du post'
    });
  }
});

export default router;

