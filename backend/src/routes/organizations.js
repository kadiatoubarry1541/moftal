import express from 'express';
import multer from 'multer';
import { Op } from 'sequelize';
import OrganizationGroup from '../models/OrganizationGroup.js';
import { authenticate } from '../middleware/auth.js';
import { uploadToImageKit } from '../services/imagekitStorage.js';
import { uploadToR2 } from '../services/r2Storage.js';
import { uploadToIDrive } from '../services/idriveStorage.js';
import { allowedInspirSections, hasLivresAccess } from '../services/inspirAccess.js';

const router = express.Router();

// Multer pour Inspir (démographie : Hommes / Femmes / Enfants) — en mémoire,
// jamais sur le disque du serveur (effacé à chaque redémarrage/redéploiement).
const uploadInspir = multer({
  storage: multer.memoryStorage(),
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

// --- Inspir (page Famille) ---
// category=inspir, subcategory=parents|femmes|hommes|enfants : « ce qu'on doit faire
// pour l'autre ». Chaque utilisateur ne lit / publie que dans les sections permises
// (voir services/inspirAccess.js). Les anciennes sections « demographie »
// (inspir_hommes, inspir_femmes, inspir_enfants) sont conservées telles quelles.
// category=livres_inspir : Bibliothèque (abonnement ou admin).

const INSPIR_GROUP_TYPE = (section) => `inspir_pour_${section}`;
const LIVRES_GROUP_TYPE = 'inspir_livres';
const GROUP_NAMES = {
  parents: 'Inspir — pour nos parents',
  femmes: 'Inspir — pour nos femmes',
  hommes: 'Inspir — pour nos maris',
  enfants: 'Inspir — pour nos enfants',
};

// Résout le groupe demandé et vérifie le droit d'accès de l'utilisateur.
async function resolveInspirTarget(user, category, subcategory) {
  if (category === 'livres_inspir') {
    if (!(await hasLivresAccess(user))) {
      return { status: 402, message: 'Abonnement Bibliothèque requis.' };
    }
    return { groupType: LIVRES_GROUP_TYPE, name: 'Inspir — Bibliothèque' };
  }
  if (category === 'inspir') {
    if (!allowedInspirSections(user).includes(subcategory)) {
      return { status: 403, message: "Cette section d'Inspir ne vous est pas ouverte." };
    }
    return { groupType: INSPIR_GROUP_TYPE(subcategory), name: GROUP_NAMES[subcategory] };
  }
  return { status: 400, message: 'category et subcategory invalides' };
}

// @route   GET /api/organizations/inspir/sections
// @desc    Sections d'Inspir ouvertes à l'utilisateur connecté
router.get('/inspir/sections', (req, res) => {
  res.json({ success: true, sections: allowedInspirSections(req.user) });
});

// @route   GET /api/organizations/posts?category=inspir&subcategory=parents|femmes|hommes|enfants
//          GET /api/organizations/posts?category=livres_inspir
// @desc    Publications d'une section Inspir (ou livres de la Bibliothèque)
// @access  Authentifié + droit sur la section
router.get('/posts', async (req, res) => {
  try {
    const { category, subcategory } = req.query;
    const target = await resolveInspirTarget(req.user, category, subcategory);
    if (target.status) return res.status(target.status).json({ success: false, message: target.message, posts: [] });
    const groupType = target.groupType;
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
    const target = await resolveInspirTarget(user, category, subcategory);
    if (target.status) return res.status(target.status).json({ success: false, message: target.message });
    if (category === 'livres_inspir' && !(req.file && req.file.mimetype === 'application/pdf')) {
      return res.status(400).json({ success: false, message: 'Le PDF du livre est obligatoire.' });
    }
    const type = (messageType || 'text').toLowerCase();
    // Un écrit peut être un texte, un PDF, ou les deux
    if (type === 'text' && !(content && String(content).trim()) && !req.file) {
      return res.status(400).json({ success: false, message: 'Veuillez entrer un message' });
    }
    if (type !== 'text' && !req.file) {
      return res.status(400).json({ success: false, message: 'Veuillez sélectionner un fichier' });
    }
    const groupType = target.groupType;
    let group = await OrganizationGroup.findOne({
      where: { type: groupType, isActive: true }
    });
    if (!group) {
      group = await OrganizationGroup.create({
        name: target.name,
        description: target.name,
        type: groupType,
        members: [],
        posts: [],
        createdBy: numeroH,
        isActive: true
      });
    }
    let mediaUrl = null;
    if (req.file) {
      mediaUrl = req.file.mimetype.startsWith('image/')
        ? await uploadToImageKit(req.file.buffer, req.file.originalname, 'inspir')
        : await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype, 'inspir');
      uploadToIDrive(req.file.buffer, req.file.originalname, req.file.mimetype, 'inspir').catch(() => {});
    }
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
      section: category === 'inspir' ? subcategory : 'livres',
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








