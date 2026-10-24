import express from 'express';
import { Op } from 'sequelize';
import FaithContent from '../models/FaithContent.js';
import FaithCommunity from '../models/FaithCommunity.js';
import HolyBook from '../models/HolyBook.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Toutes les routes nécessitent l'authentification
router.use(authenticate);

// ========== CONTENU DE FOI ==========

// @route   GET /api/faith/content
// @desc    Récupérer le contenu de foi
// @access  Authentifié
router.get('/content', async (req, res) => {
  try {
    const { religion, category, type } = req.query;
    
    const where = { isActive: true };
    if (religion) {
      where.religion = religion;
    }
    if (category) {
      where.category = category;
    }
    if (type) {
      where.type = type;
    }
    
    const content = await FaithContent.findAll({
      where,
      order: [['created_at', 'DESC']]
    });
    
    res.json({
      success: true,
      content
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du contenu:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération du contenu'
    });
  }
});

// @route   POST /api/faith/content
// @desc    Créer du contenu de foi
// @access  Authentifié
router.post('/content', async (req, res) => {
  try {
    const { title, description, type, content, category, religion } = req.body;
    
    const faithContent = await FaithContent.create({
      title,
      description,
      type,
      content,
      category,
      religion,
      // Toujours au nom de la personne connectée (jamais un auteur choisi par le téléphone)
      createdBy: req.user.numeroH
    });
    
    res.status(201).json({
      success: true,
      content: faithContent,
      message: 'Contenu créé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création du contenu:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création du contenu'
    });
  }
});

// ========== RÉFLÉCHISSONS (page /reflechissons) ==========
// Les réflexions sont le contenu de foi publié par les membres.
router.get('/reflections', async (req, res) => {
  try {
    const reflections = await FaithContent.findAll({ where: { isActive: true }, order: [['created_at', 'DESC']], limit: 200 });
    res.json({ success: true, reflections });
  } catch (error) {
    console.error('Erreur réflexions:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur lors du chargement des réflexions' });
  }
});

router.post('/reflections', async (req, res) => {
  try {
    const { title, description, type, content, category, religion } = req.body || {};
    if (!String(title || '').trim()) return res.status(400).json({ success: false, message: 'Le titre est obligatoire.' });
    const reflection = await FaithContent.create({
      title: String(title).trim().slice(0, 255),
      description: description || '',
      type: ['video', 'audio', 'message'].includes(type) ? type : 'message',
      content: content || '',
      category: category || 'reflexion',
      religion: religion || req.user.religion || '',
      createdBy: req.user.numeroH
    });
    res.status(201).json({ success: true, reflection });
  } catch (error) {
    console.error('Erreur création réflexion:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur lors de la création de la réflexion' });
  }
});

// ========== COMMUNAUTÉS DE FOI ==========

// @route   GET /api/faith/communities
// @desc    Récupérer les communautés de foi
// @access  Authentifié
router.get('/communities', async (req, res) => {
  try {
    const { religion } = req.query;
    
    const where = { isActive: true };
    if (religion) {
      where.religion = religion;
    }
    
    const communities = await FaithCommunity.findAll({
      where,
      order: [['created_at', 'DESC']]
    });
    
    res.json({
      success: true,
      communities
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des communautés:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des communautés'
    });
  }
});

// @route   POST /api/faith/communities
// @desc    Créer une communauté de foi
// @access  Authentifié
router.post('/communities', async (req, res) => {
  try {
    const { name, description, religion, createdBy } = req.body;
    
    const community = await FaithCommunity.create({
      name,
      description,
      religion,
      members: [createdBy || req.user.numeroH],
      posts: [],
      createdBy: createdBy || req.user.numeroH
    });
    
    res.status(201).json({
      success: true,
      community,
      message: 'Communauté créée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création de la communauté:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création de la communauté'
    });
  }
});

// @route   POST /api/faith/communities/:id/join
// @desc    Rejoindre une communauté de foi
// @access  Authentisé
router.post('/communities/:id/join', async (req, res) => {
  try {
    const { numeroH } = req.body;
    const community = await FaithCommunity.findByPk(req.params.id);
    
    if (!community) {
      return res.status(404).json({
        success: false,
        message: 'Communauté non trouvée'
      });
    }
    
    // Copie : modifier le tableau en place n'est jamais enregistré
    const members = [...(community.members || [])];
    if (!members.includes(numeroH)) {
      members.push(numeroH);
      await community.update({ members });
    }
    
    res.json({
      success: true,
      message: 'Vous avez rejoint la communauté avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'adhésion à la communauté:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'adhésion à la communauté'
    });
  }
});

// @route   POST /api/faith/communities/:id/posts
// @desc    Créer un post dans une communauté de foi
// @access  Authentisé
router.post('/communities/:id/posts', async (req, res) => {
  try {
    const { content, type, author, authorName } = req.body;
    const community = await FaithCommunity.findByPk(req.params.id);
    
    if (!community) {
      return res.status(404).json({
        success: false,
        message: 'Communauté non trouvée'
      });
    }
    
    // Copie : modifier le tableau en place n'est jamais enregistré
    const posts = [...(community.posts || [])];
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
    await community.update({ posts });
    
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

// ========== LIVRES SAINTS ==========

// @route   GET /api/faith/books
// @desc    Récupérer les livres saints
// @access  Authentisé
router.get('/books', async (req, res) => {
  try {
    const { religion } = req.query;
    
    const where = { isActive: true };
    if (religion) {
      where.religion = religion;
    }
    
    const books = await HolyBook.findAll({
      where,
      order: [['created_at', 'DESC']]
    });
    
    res.json({
      success: true,
      books
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des livres:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des livres'
    });
  }
});

export default router;






















