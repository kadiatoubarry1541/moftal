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

// ========== RÉFLÉCHISSONS (page /reflechissons) ==========
// Les réflexions sont des contenus de foi marqués « reflechissons » : même table,
// rien de nouveau à créer en base.
const ESPACE_REFLEXIONS = 'reflechissons';
const enReflexion = (c) => {
  const contenu = c.content || {};
  return {
    id: c.id,
    title: c.title,
    description: c.description || '',
    type: c.type,
    content: { text: contenu.text, videoUrl: contenu.videoUrl, audioUrl: contenu.audioUrl, transcript: contenu.transcript },
    religion: c.religion,
    category: c.category,
    isActive: c.isActive,
    createdBy: c.createdBy,
    createdAt: c.createdAt || c.created_at,
    tags: Array.isArray(contenu.tags) ? contenu.tags : [],
  };
};

// @route   GET /api/faith/reflections
router.get('/reflections', async (req, res) => {
  try {
    const rows = await FaithContent.findAll({
      where: { isActive: true, [Op.and]: [FaithContent.sequelize.literal(`content->>'espace' = '${ESPACE_REFLEXIONS}'`)] },
      order: [['created_at', 'DESC']],
      limit: 500,
    });
    res.json({ success: true, reflections: rows.map(enReflexion) });
  } catch (error) {
    console.error('faith/reflections GET:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// @route   POST /api/faith/reflections — l'auteur est toujours la personne connectée
router.post('/reflections', async (req, res) => {
  try {
    const { title, description, type, content, category, religion, tags } = req.body || {};
    const titre = String(title || '').trim().slice(0, 255);
    const texte = String(content || '').trim();
    const genre = ['message', 'video', 'audio'].includes(type) ? type : 'message';
    if (!titre || !texte) return res.status(400).json({ success: false, message: 'Titre et contenu requis.' });
    const contenu = { espace: ESPACE_REFLEXIONS, tags: (Array.isArray(tags) ? tags : []).map(String).map(t => t.trim()).filter(Boolean).slice(0, 20) };
    if (genre === 'video') contenu.videoUrl = texte;
    else if (genre === 'audio') contenu.audioUrl = texte;
    else contenu.text = texte.slice(0, 20000);
    const c = await FaithContent.create({
      title: titre,
      description: String(description || '').slice(0, 5000),
      type: genre,
      content: contenu,
      category: String(category || 'reflexion').slice(0, 50),
      religion: String(religion || req.user.religion || 'Islam').slice(0, 50),
      createdBy: req.user.numeroH,
    });
    res.status(201).json({ success: true, reflection: enReflexion(c) });
  } catch (error) {
    console.error('faith/reflections POST:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});


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
    const { name, description, religion } = req.body;
    
    const community = await FaithCommunity.create({
      name,
      description,
      religion,
      members: [req.user.numeroH],
      posts: [],
      createdBy: req.user.numeroH
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
    // On rejoint toujours en son propre nom (jamais un NuméroH envoyé par le navigateur)
    const numeroH = req.user.numeroH;
    const community = await FaithCommunity.findByPk(req.params.id);
    
    if (!community) {
      return res.status(404).json({
        success: false,
        message: 'Communauté non trouvée'
      });
    }
    
    const members = community.members || [];
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
    const { content, type, authorName } = req.body;
    const community = await FaithCommunity.findByPk(req.params.id);
    
    if (!community) {
      return res.status(404).json({
        success: false,
        message: 'Communauté non trouvée'
      });
    }
    
    const posts = community.posts || [];
    const newPost = {
      id: Date.now().toString(),
      author: req.user.numeroH,
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






















