import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Op } from 'sequelize';
import OrganizationGroup from '../models/OrganizationGroup.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Multer pour Inspir (démographie : Hommes / Femmes / Enfants)
const inspirStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/inspir');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `inspir-${uniqueSuffix}${path.extname(file.originalname) || ''}`);
  }
});
const uploadInspir = multer({
  storage: inspirStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Seuls image, vidéo, audio et PDF sont autorisés'), false);
    }
  }
});

// Toutes les routes nécessitent l'authentification
router.use(authenticate);

// --- Inspir (page Famille) : category=demographie, subcategory=hommes|femmes|enfants ---

const INSPIR_GROUP_TYPE = (sub) => `inspir_${sub}`;

// @route   GET /api/organizations/posts?category=demographie&subcategory=hommes|femmes|enfants
// @desc    Liste des messages Inspir pour la section Hommes / Femmes / Enfants
// @access  Authentifié
router.get('/posts', async (req, res) => {
  try {
    const { category, subcategory } = req.query;
    if (category !== 'demographie' || !['hommes', 'femmes', 'enfants'].includes(subcategory)) {
      return res.json({ success: true, posts: [] });
    }
    const groupType = INSPIR_GROUP_TYPE(subcategory);
    const group = await OrganizationGroup.findOne({
      where: { type: groupType, isActive: true }
    });
    const posts = (group && Array.isArray(group.posts)) ? group.posts : [];
    res.json({ success: true, posts });
  } catch (error) {
    console.error('Erreur GET /organizations/posts:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// @route   POST /api/organizations/create-post
// @desc    Publier un message Inspir (texte ou média)
// @access  Authentifié
router.post('/create-post', uploadInspir.single('media'), async (req, res) => {
  try {
    const user = req.user;
    const numeroH = user.numeroH || user.numero_h;
    const authorName = [user.prenom, user.nomFamille].filter(Boolean).join(' ') || numeroH;
    const { content, messageType, category, subcategory, postCategory } = req.body;
    if (category !== 'demographie' || !['hommes', 'femmes', 'enfants'].includes(subcategory)) {
      return res.status(400).json({ success: false, message: 'category et subcategory invalides' });
    }
    const type = (messageType || 'text').toLowerCase();
    if (type === 'text' && !(content && String(content).trim())) {
      return res.status(400).json({ success: false, message: 'Veuillez entrer un message' });
    }
    if (type !== 'text' && !req.file) {
      return res.status(400).json({ success: false, message: 'Veuillez sélectionner un fichier' });
    }
    const groupType = INSPIR_GROUP_TYPE(subcategory);
    let group = await OrganizationGroup.findOne({
      where: { type: groupType, isActive: true }
    });
    if (!group) {
      const names = { hommes: 'Inspir Hommes', femmes: 'Inspir Femmes', enfants: 'Inspir Enfants' };
      group = await OrganizationGroup.create({
        name: names[subcategory] || `Inspir ${subcategory}`,
        description: `Inspir dédiée aux ${subcategory}`,
        type: groupType,
        members: [],
        posts: [],
        createdBy: numeroH,
        isActive: true
      });
    }
    const mediaUrl = req.file ? `/uploads/inspir/${req.file.filename}` : null;
    const newPost = {
      id: Date.now().toString() + '-' + Math.random().toString(36).slice(2),
      author: numeroH,
      authorName,
      numeroH,
      content: (content && String(content).trim()) || '',
      messageType: type,
      category: postCategory || 'information',
      postCategory: postCategory || 'information',
      mediaUrl,
      createdAt: new Date().toISOString()
    };
    const posts = Array.isArray(group.posts) ? [...group.posts] : [];
    posts.push(newPost);
    await group.update({ posts });
    res.status(201).json({ success: true, post: newPost });
  } catch (error) {
    console.error('Erreur POST /organizations/create-post:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur lors de la publication'
    });
  }
});

// @route   GET /api/organizations/groups
// @desc    Récupérer les organisations d'organisation
// @access  Authentifié
router.get('/groups', async (req, res) => {
  try {
    const { type } = req.query;
    
    const where = { isActive: true };
    if (type) {
      where.type = type;
    }
    
    const groups = await OrganizationGroup.findAll({
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

// @route   POST /api/organizations/groups
// @desc    Créer un nouveau organisation d'organisation
// @access  Authentifié
router.post('/groups', async (req, res) => {
  try {
    const { name, description, type, createdBy } = req.body;
    
    const group = await OrganizationGroup.create({
      name,
      description,
      type,
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

// @route   POST /api/organizations/groups/:id/join
// @desc    Rejoindre un organisation d'organisation
// @access  Authentisé
router.post('/groups/:id/join', async (req, res) => {
  try {
    const { numeroH } = req.body;
    const group = await OrganizationGroup.findByPk(req.params.id);
    
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

// @route   POST /api/organizations/groups/:id/posts
// @desc    Créer un post dans un organisation d'organisation
// @access  Authentifié
router.post('/groups/:id/posts', async (req, res) => {
  try {
    const { content, type, author, authorName } = req.body;
    const group = await OrganizationGroup.findByPk(req.params.id);
    
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

export default router;








