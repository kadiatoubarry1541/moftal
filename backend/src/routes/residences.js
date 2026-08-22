import express from 'express';
import multer from 'multer';
import { Op } from 'sequelize';
import ResidenceGroup from '../models/ResidenceGroup.js';
import ResidenceMessage from '../models/ResidenceMessage.js';
import User from '../models/User.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { sequelize } from '../config/database.js';
import { uploadToImageKit } from '../services/imagekitStorage.js';
import { uploadToR2 } from '../services/r2Storage.js';
import { uploadToIDrive } from '../services/idriveStorage.js';

const router = express.Router();

// S'assure que la colonne logo_url existe (au cas où le déploiement n'a pas pu
// altérer la table automatiquement — voir clinic-management.js pour le même principe)
let logoColumnEnsured = false;
async function ensureLogoColumn() {
  if (logoColumnEnsured) return;
  try {
    await sequelize.query('ALTER TABLE residence_groups ADD COLUMN IF NOT EXISTS logo_url VARCHAR(255)');
    logoColumnEnsured = true;
  } catch (e) {
    console.warn('ensureLogoColumn:', e.message);
  }
}

function isPlatformAdmin(user) {
  return !!(user && (user.role === 'admin' || user.role === 'super-admin' || user.isMasterAdmin || user.canViewAll));
}

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

// Upload en mémoire pour les médias — jamais sur le disque du serveur
// (effacé à chaque redémarrage/redéploiement), envoyé ensuite vers le cloud.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers image, vidéo et audio sont autorisés'), false);
    }
  }
});

// Upload en mémoire dédié au logo de groupe (image uniquement, plus léger)
const uploadLogo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images sont autorisées pour le logo'), false);
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
    await ensureLogoColumn();
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
        description: `Groupe des habitants de ${displayName}`,
        admin: req.user.numeroH,
        members: [req.user.numeroH],
        createdBy: req.user.numeroH
      });
      groups = [newGroup];
    } else if (normalizedLocation && groups.length > 0) {
      // Auto-rejoindre le premier groupe du quartier si pas encore membre
      const group = groups[0];
      const members = group.members || [];
      if (!members.includes(req.user.numeroH)) {
        members.push(req.user.numeroH);
        await group.update({ members });
        groups[0] = await ResidenceGroup.findByPk(group.id);
      }
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
    await ensureLogoColumn();
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
    await ensureLogoColumn();
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
    await ensureLogoColumn();
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
      messageData.mediaUrl = req.file.mimetype.startsWith('image/')
        ? await uploadToImageKit(req.file.buffer, req.file.originalname, 'residences')
        : await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype, 'residences');
      uploadToIDrive(req.file.buffer, req.file.originalname, req.file.mimetype, 'residences').catch(() => {});
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
    await ensureLogoColumn();
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

// @route   POST /api/residences/groups/:id/logo
// @desc    Uploader ou remplacer le logo d'un groupe de quartier
// @access  Admin du groupe (le premier habitant à l'avoir rejoint) ou admin Moftal
router.post('/groups/:id/logo', uploadLogo.single('logo'), async (req, res) => {
  try {
    await ensureLogoColumn();
    const { id } = req.params;

    const group = await ResidenceGroup.findByPk(id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Groupe non trouvé' });
    }

    if (!isPlatformAdmin(req.user) && group.admin !== req.user.numeroH) {
      return res.status(403).json({ success: false, message: 'Seul l\'administrateur de ce groupe peut changer le logo' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Aucune image envoyée' });
    }

    const logoUrl = await uploadToImageKit(req.file.buffer, req.file.originalname, 'residences');
    uploadToIDrive(req.file.buffer, req.file.originalname, req.file.mimetype, 'residences').catch(() => {});
    await group.update({ logoUrl });

    res.json({ success: true, message: 'Logo mis à jour', logoUrl });
  } catch (error) {
    console.error('Erreur lors de l\'upload du logo:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur lors de l\'upload du logo' });
  }
});

// @route   DELETE /api/residences/groups/:id/logo
// @desc    Retirer le logo d'un groupe (revenir à l'icône par défaut)
// @access  Admin du groupe ou admin Moftal
router.delete('/groups/:id/logo', async (req, res) => {
  try {
    await ensureLogoColumn();
    const { id } = req.params;

    const group = await ResidenceGroup.findByPk(id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Groupe non trouvé' });
    }

    if (!isPlatformAdmin(req.user) && group.admin !== req.user.numeroH) {
      return res.status(403).json({ success: false, message: 'Seul l\'administrateur de ce groupe peut retirer le logo' });
    }

    await group.update({ logoUrl: null });

    res.json({ success: true, message: 'Logo retiré' });
  } catch (error) {
    console.error('Erreur lors de la suppression du logo:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

export default router;


