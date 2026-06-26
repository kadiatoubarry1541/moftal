import { Router } from 'express';
import multer from 'multer';
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import User from '../models/User.js';
import PublishedStory from '../models/PublishedStory.js';
import Friend from '../models/Friend.js';
import { authenticate } from '../middleware/auth.js';

// Stockage en mémoire → conversion en base64 et stockage en DB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB max
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers image et vidéo sont autorisés'), false);
    }
  }
});

// Convertit le buffer en data URL base64
function toDataUrl(file) {
  return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
}

const router = Router();

// Route publique pour récupérer les histoires publiées (avant authenticate)
// @route   GET /api/user-stories/published
// @desc    Récupérer toutes les histoires publiées (publique)
// @access  Public
router.get('/published', async (req, res) => {
  try {
    const { sectionId, generation, region, country, search, numeroH, limit = 50, offset = 0 } = req.query;

    const where = {
      isPublished: true
    };

    if (sectionId) {
      where.sectionId = sectionId;
    }
    if (generation) {
      where.generation = generation;
    }
    if (region) {
      where.region = region;
    }
    if (country) {
      where.country = country;
    }
    if (numeroH) {
      where.numeroH = numeroH;
    }

    const stories = await PublishedStory.findAll({
      where,
      order: [['publishedAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Filtrer par recherche si fourni
    let filteredStories = stories;
    if (search) {
      const searchLower = String(search).toLowerCase();
      filteredStories = stories.filter((story) =>
        story.content.toLowerCase().includes(searchLower) ||
        story.authorName.toLowerCase().includes(searchLower) ||
        story.sectionTitle.toLowerCase().includes(searchLower)
      );
    }

    // Récupérer les photos de profil de tous les auteurs en une seule requête
    const uniqueNumeroHs = [...new Set(filteredStories.map(s => s.numeroH))];
    const authors = await User.findAll({
      where: { numeroH: { [Op.in]: uniqueNumeroHs } },
      attributes: ['numeroH', 'photo']
    });
    const photoMap = {};
    authors.forEach(u => { photoMap[u.numeroH] = u.photo || null; });

    const storiesWithPhoto = filteredStories.map(s => ({
      ...s.toJSON(),
      authorPhoto: photoMap[s.numeroH] || null
    }));

    res.json({
      success: true,
      stories: storiesWithPhoto,
      total: storiesWithPhoto.length
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des histoires publiées:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des histoires'
    });
  }
});

// @route   GET /api/user-stories/published/stats
// @desc    Récupérer les statistiques des histoires publiées
// @access  Public
router.get('/published/stats', async (_req, res) => {
  try {
    const totalStories = await PublishedStory.count({
      where: { isPublished: true }
    });

    const storiesBySection = await PublishedStory.findAll({
      where: { isPublished: true },
      attributes: [
        'sectionId',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['sectionId'],
      raw: true
    });

    const storiesByGeneration = await PublishedStory.findAll({
      where: { isPublished: true },
      attributes: [
        'generation',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['generation'],
      raw: true
    });

    res.json({
      success: true,
      stats: {
        totalStories,
        storiesBySection,
        storiesByGeneration
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des statistiques'
    });
  }
});

// Toutes les autres routes nécessitent l'authentification
router.use(authenticate);

// @route   POST /api/user-stories
// @desc    Sauvegarder une section d'histoire utilisateur
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { numeroH, sectionId, data } = req.body;

    if (!numeroH || !sectionId) {
      return res.status(400).json({
        success: false,
        message: 'NumeroH et sectionId sont requis'
      });
    }

    const user = await User.findByNumeroH(numeroH);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Récupérer les histoires existantes ou initialiser un objet vide
    let stories = {};
    try {
      if (user.userStories && typeof user.userStories === 'string') {
        stories = JSON.parse(user.userStories);
      } else if (user.userStories && typeof user.userStories === 'object') {
        stories = user.userStories;
      }
    } catch (error) {
      console.error('Erreur lors de la lecture des histoires existantes:', error);
      stories = {};
    }

    // Mettre à jour la section spécifique
    // Si data est fourni, utiliser data, sinon utiliser l'ancien format pour compatibilité
    if (data) {
      stories[sectionId] = {
        content: data.content || '',
        photos: data.photos || [],
        videos: data.videos || []
      };
    } else {
      // Compatibilité avec l'ancien format
      stories[sectionId] = {
        content: req.body.content || '',
        photos: [],
        videos: []
      };
    }

    // Sauvegarder dans la base de données
    await user.update({ userStories: JSON.stringify(stories) });

    res.json({
      success: true,
      message: 'Histoire sauvegardée avec succès',
      sectionId,
      data: stories[sectionId]
    });
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de l\'histoire:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la sauvegarde de l\'histoire'
    });
  }
});

// @route   POST /api/user-stories/all
// @desc    Sauvegarder toutes les sections d'histoire utilisateur
// @access  Private
router.post('/all', async (req, res) => {
  try {
    const { numeroH, stories } = req.body;

    if (!numeroH || !stories) {
      return res.status(400).json({
        success: false,
        message: 'NumeroH et stories sont requis'
      });
    }

    const user = await User.findByNumeroH(numeroH);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Sauvegarder toutes les histoires
    await user.update({ userStories: JSON.stringify(stories) });

    res.json({
      success: true,
      message: 'Toutes les histoires ont été sauvegardées avec succès',
      stories
    });
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des histoires:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la sauvegarde des histoires'
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET + PUT /api/user-stories/mon-contact-narrateur
// Avant GET /:numeroH pour ne pas être intercepté par le wildcard
// ─────────────────────────────────────────────────────────────────────────────
router.get('/mon-contact-narrateur', async (req, res) => {
  try {
    const user = await User.findOne({
      where: { numeroH: req.userId },
      attributes: ['narrateurContact']
    });
    res.json({ success: true, contact: user?.narrateurContact || null });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.put('/mon-contact-narrateur', async (req, res) => {
  try {
    const { contact } = req.body;
    if (!contact || !contact.trim()) {
      return res.status(400).json({ success: false, message: 'Numéro requis.' });
    }
    await User.update(
      { narrateurContact: contact.trim() },
      { where: { numeroH: req.userId } }
    );
    res.json({ success: true, message: 'Numéro de contact narrateur mis à jour.' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Récupérer le flux de stories Mes Amours (amis + soi-même) sur 24h
// @route   GET /api/user-stories/mes-amours/feed
// @desc    Récupère les stories Mes Amours des amis (et de soi-même) des dernières 24h
// @access  Private
router.get('/mes-amours/feed', async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise'
      });
    }

    // Récupérer tous les amis acceptés
    const friends = await Friend.findAll({
      where: {
        status: 'accepted',
        [Op.or]: [
          { userNumeroH: user.numeroH },
          { friendNumeroH: user.numeroH }
        ]
      }
    });

    const numeros = new Set([user.numeroH]);
    for (const f of friends) {
      if (f.userNumeroH === user.numeroH) {
        numeros.add(f.friendNumeroH);
      } else {
        numeros.add(f.userNumeroH);
      }
    }

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const stories = await PublishedStory.findAll({
      where: {
        sectionId: 'mes_amours_story',
        isPublished: true,
        numeroH: { [Op.in]: Array.from(numeros) },
        publishedAt: { [Op.gte]: since24h }
      },
      order: [['publishedAt', 'DESC']]
    });

    res.json({
      success: true,
      stories
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du feed Mes Amours:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des stories'
    });
  }
});

// @route   GET /api/user-stories/:numeroH
// @desc    Récupérer toutes les histoires d'un utilisateur
// @access  Private
router.get('/:numeroH', async (req, res) => {
  try {
    const { numeroH } = req.params;
    const requestingUser = req.user;

    if (!numeroH) {
      return res.status(400).json({
        success: false,
        message: 'NumeroH est requis'
      });
    }

    // Vérifier que l'utilisateur demande ses propres histoires ou qu'il est admin
    if (requestingUser.numeroH !== numeroH && requestingUser.role !== 'admin' && requestingUser.role !== 'super-admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé - Vous ne pouvez accéder qu\'à vos propres histoires'
      });
    }

    const user = await User.findByNumeroH(numeroH);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Récupérer les histoires
    let stories = {};
    try {
      if (user.userStories && typeof user.userStories === 'string') {
        stories = JSON.parse(user.userStories);
      } else if (user.userStories && typeof user.userStories === 'object') {
        stories = user.userStories;
      }
    } catch (error) {
      console.error('Erreur lors de la lecture des histoires:', error);
      stories = {};
    }

    res.json({
      success: true,
      stories,
      numeroH: user.numeroH
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des histoires:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des histoires'
    });
  }
});

// @route   POST /api/user-stories/upload
// @desc    Uploader une photo ou vidéo pour une section
// @access  Private
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier fourni'
      });
    }

    const { numeroH, sectionId, type } = req.body;

    if (!numeroH || !sectionId || !type) {
      return res.status(400).json({
        success: false,
        message: 'NumeroH, sectionId et type sont requis'
      });
    }

    const user = await User.findByNumeroH(numeroH);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier que le type est valide
    if (type !== 'photo' && type !== 'video') {
      return res.status(400).json({
        success: false,
        message: 'Type invalide. Doit être "photo" ou "video"'
      });
    }

    // Récupérer les histoires existantes
    let stories = {};
    try {
      if (user.userStories && typeof user.userStories === 'string') {
        stories = JSON.parse(user.userStories);
      } else if (user.userStories && typeof user.userStories === 'object') {
        stories = user.userStories;
      }
    } catch (error) {
      console.error('Erreur lors de la lecture des histoires existantes:', error);
      stories = {};
    }

    // Initialiser la section si elle n'existe pas
    if (!stories[sectionId]) {
      stories[sectionId] = {
        content: '',
        photos: [],
        videos: []
      };
    }

    // Convertir en base64 et stocker en DB
    const dataUrl = toDataUrl(req.file);
    if (type === 'photo') {
      if (!stories[sectionId].photos) stories[sectionId].photos = [];
      stories[sectionId].photos.push(dataUrl);
    } else {
      if (!stories[sectionId].videos) stories[sectionId].videos = [];
      stories[sectionId].videos.push(dataUrl);
    }

    // Sauvegarder dans la base de données
    await user.update({ userStories: JSON.stringify(stories) });

    res.json({
      success: true,
      message: `${type === 'photo' ? 'Photo' : 'Vidéo'} uploadée avec succès`,
      fileUrl: dataUrl,
      type
    });
  } catch (error) {
    console.error('Erreur lors de l\'upload:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'upload'
    });
  }
});

// Âge minimum requis par section
const SECTION_AGE_REQUIREMENTS = {
  naissance: 25, jeunesse: 25, mariage: 25,
  revelation: 40, persecution: 40,
  unification: 60, heritage: 60
};

// @route   POST /api/user-stories/publish
// @desc    Publier une section d'histoire (avec validation âge + 4 témoins)
// @access  Private
router.post('/publish', async (req, res) => {
  try {
    const { numeroH, sectionId, witnesses } = req.body;

    if (!numeroH || !sectionId) {
      return res.status(400).json({ success: false, message: 'NumeroH et sectionId sont requis' });
    }

    const user = await User.findByNumeroH(numeroH);
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });

    // Pas de restriction d'âge : chacun peut publier ses sections librement

    // Les témoins sont optionnels à la publication — ils peuvent témoigner eux-mêmes plus tard
    const witnessDetails = [];

    // --- Récupérer le contenu sauvegardé ---
    let stories = {};
    try {
      if (user.userStories && typeof user.userStories === 'string') {
        stories = JSON.parse(user.userStories);
      } else if (user.userStories && typeof user.userStories === 'object') {
        stories = user.userStories;
      }
    } catch {
      return res.status(400).json({ success: false, message: 'Aucune histoire trouvée pour cette section' });
    }

    const sectionData = stories[sectionId];
    if (!sectionData || !sectionData.content) {
      return res.status(400).json({ success: false, message: 'Cette section ne contient pas de contenu à publier' });
    }

    const sectionTitles = {
      naissance: 'Naissance et Enfance', jeunesse: 'Jeunesse et Apprentissage',
      mariage: 'Union et Engagement', revelation: 'Réalisation et Mission',
      persecution: 'Épreuves et Résilience', unification: 'Réalisation et Unification',
      heritage: 'Héritage et Transmission'
    };

    const existingStory = await PublishedStory.findOne({
      where: { numeroH: user.numeroH, sectionId, isPublished: true }
    });

    const storyData = {
      numeroH: user.numeroH,
      authorName: `${user.prenom} ${user.nomFamille}`,
      sectionId,
      sectionTitle: sectionTitles[sectionId] || sectionId,
      content: sectionData.content,
      photos: sectionData.photos || [],
      videos: sectionData.videos || [],
      generation: user.generation || null,
      region: user.regionOrigine || null,
      country: user.pays || null,
      isPublished: true,
      publishedAt: new Date(),
      witnesses: witnessDetails
    };

    if (existingStory) {
      await existingStory.update(storyData);
    } else {
      await PublishedStory.create(storyData);
    }

    res.json({
      success: true,
      message: 'Histoire publiée avec succès dans l\'Histoire de l\'Humanité',
      story: storyData
    });
  } catch (error) {
    console.error('Erreur lors de la publication:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur lors de la publication' });
  }
});

// @route   DELETE /api/user-stories/publish/:sectionId
// @desc    Supprimer une publication de l'Histoire de l'Humanité
// @access  Private
router.delete('/publish/:sectionId', async (req, res) => {
  try {
    const { sectionId } = req.params;
    const { numeroH } = req.body;
    const requestingUser = req.user;

    const targetNumeroH = numeroH || requestingUser.numeroH;
    // Seul l'auteur ou un admin peut supprimer
    if (requestingUser.numeroH !== targetNumeroH && requestingUser.role !== 'admin' && requestingUser.role !== 'super-admin') {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }

    const story = await PublishedStory.findOne({
      where: { numeroH: targetNumeroH, sectionId, isPublished: true }
    });
    if (!story) {
      return res.status(404).json({ success: false, message: 'Publication non trouvée' });
    }

    await story.update({ isPublished: false });

    res.json({ success: true, message: 'Publication supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// @route   POST /api/user-stories/testify/:storyId
// @desc    Un utilisateur témoigne pour une histoire publiée (max 4 témoins)
// @access  Private
router.post('/testify/:storyId', async (req, res) => {
  try {
    const { storyId } = req.params;
    const witness = req.user;

    const story = await PublishedStory.findOne({
      where: { id: storyId, isPublished: true }
    });
    if (!story) {
      return res.status(404).json({ success: false, message: 'Publication introuvable' });
    }
    if (story.numeroH === witness.numeroH) {
      return res.status(400).json({ success: false, message: 'Vous ne pouvez pas témoigner pour votre propre histoire' });
    }

    const currentWitnesses = story.witnesses || [];
    const alreadyWitness = currentWitnesses.some(w => w.numeroH === witness.numeroH);
    if (alreadyWitness) {
      return res.status(400).json({ success: false, message: 'Vous avez déjà témoigné pour cette histoire' });
    }
    if (currentWitnesses.length >= 4) {
      return res.status(400).json({ success: false, message: 'Cette histoire a déjà 4 témoins' });
    }

    const witnessAge = witness.getAge ? witness.getAge() : null;
    const newWitness = {
      numeroH: witness.numeroH,
      name: `${witness.prenom} ${witness.nomFamille}`,
      age: witnessAge,
      testimoniedAt: new Date().toISOString()
    };

    const updatedWitnesses = [...currentWitnesses, newWitness];
    await story.update({ witnesses: updatedWitnesses });

    res.json({
      success: true,
      message: 'Votre témoignage a été enregistré',
      witnesses: updatedWitnesses
    });
  } catch (error) {
    console.error('Erreur témoignage:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ==========================
// Stories « Mes Amours » (type story 24h pour les amis)
// ==========================

// Publier une story simple (image ou vidéo + texte court)
// @route   POST /api/user-stories/mes-amours/story
// @desc    Publier une story Mes Amours (expirant au bout de 24h)
// @access  Private
router.post('/mes-amours/story', upload.single('file'), async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier fourni'
      });
    }

    // Limite à 10MB pour les stories (éviter saturation DB)
    if (req.file.size > 10 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'Fichier trop volumineux. Maximum 10 MB pour une story.'
      });
    }

    const isImage = req.file.mimetype.startsWith('image/');
    const isVideo = req.file.mimetype.startsWith('video/');

    if (!isImage && !isVideo) {
      return res.status(400).json({
        success: false,
        message: 'Seuls les fichiers image ou vidéo sont autorisés pour les stories'
      });
    }

    const content = (req.body.content || '').toString().slice(0, 500);
    // Convertir en base64 → stockage persistant en DB
    const dataUrl = toDataUrl(req.file);
    const now = new Date();

    const authorName = [user.prenom, user.nomFamille].filter(Boolean).join(' ') || user.numeroH;

    const storyData = {
      numeroH: user.numeroH,
      authorName,
      sectionId: 'mes_amours_story',
      sectionTitle: 'Mes Amours - Story',
      content,
      photos: isImage ? [dataUrl] : [],
      videos: isVideo ? [dataUrl] : [],
      generation: user.generation || null,
      region: user.regionOrigine || null,
      country: user.pays || null,
      isPublished: true,
      publishedAt: now
    };

    const story = await PublishedStory.create(storyData);

    res.json({
      success: true,
      message: 'Story publiée pour vos amis (valable 24h)',
      story
    });
  } catch (error) {
    console.error('Erreur lors de la publication Mes Amours:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: `Erreur serveur lors de la publication de la story : ${error.message}`
    });
  }
});

export default router;
