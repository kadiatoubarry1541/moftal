import express from 'express';
import { Op } from 'sequelize';
import ActivityGroup from '../models/ActivityGroup.js';
import ActivityMessage from '../models/ActivityMessage.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// Toutes les routes nécessitent l'authentification
router.use(authenticate);

// @route   GET /api/activities/groups
// @desc    Récupérer les groupes d'activités, filtrés par pays si fourni
// @access  Authentifié
router.get('/groups', async (req, res) => {
  try {
    const { activity, pays } = req.query;

    const where = { isActive: true };
    if (activity) where.activity = activity;

    // Filtre par pays : si fourni, on retourne les groupes de ce pays
    // + les groupes sans pays (groupes globaux legacy)
    if (pays) {
      where[Op.or] = [
        { pays },
        { pays: '' },
        { pays: null }
      ];
    }

    const groups = await ActivityGroup.findAll({
      where,
      order: [
        // Les groupes du pays demandé apparaissent en premier
        ...(pays ? [[ActivityGroup.sequelize.literal(`CASE WHEN pays = '${pays.replace(/'/g, "''")}' THEN 0 ELSE 1 END`), 'ASC']] : []),
        ['created_at', 'DESC']
      ]
    });

    res.json({ success: true, groups });
  } catch (error) {
    console.error('Erreur lors de la récupération des groupes:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// @route   POST /api/activities/groups
// @desc    Créer un groupe d'activité — tagué automatiquement au pays de l'utilisateur
// @access  Authentifié
router.post('/groups', async (req, res) => {
  try {
    const { name, description, activity, createdBy, pays } = req.body;

    // Récupère le pays depuis : body > profil utilisateur connecté
    let groupPays = pays || '';
    if (!groupPays && req.user?.numeroH) {
      try {
        const creator = await User.findByPk(req.user.numeroH);
        groupPays = creator?.pays || creator?.lieuResidence1 || '';
      } catch { /* ignore */ }
    }

    // Vérifie si un groupe existe déjà pour ce pays + activité pour éviter les doublons
    const existing = await ActivityGroup.findOne({
      where: { activity, pays: groupPays || '', isActive: true }
    });

    if (existing) {
      return res.status(200).json({ success: true, group: existing, message: 'Groupe existant' });
    }

    const group = await ActivityGroup.create({
      name: name || `Groupe ${activity}${groupPays ? ` — ${groupPays}` : ''}`,
      description: description || `Groupe d'activité pour les membres de ${groupPays || 'la plateforme'}`,
      activity,
      pays: groupPays,
      members: [createdBy || req.user.numeroH],
      posts: [],
      createdBy: createdBy || req.user.numeroH
    });

    res.status(201).json({ success: true, group, message: 'Groupe créé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la création du groupe:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// @route   POST /api/activities/groups/:id/join
// @desc    Rejoindre un organisation d'activité
// @access  Authentifié
router.post('/groups/:id/join', async (req, res) => {
  try {
    const { numeroH } = req.body;
    const group = await ActivityGroup.findByPk(req.params.id);
    
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

// @route   POST /api/activities/groups/:id/messages
// @desc    Créer un message dans un organisation d'activité
// @access  Authentifié
router.post('/groups/:id/messages', upload.single('media'), async (req, res) => {
  try {
    const { id } = req.params;
    const { content, messageType, category } = req.body;
    const user = req.user;
    
    const group = await ActivityGroup.findByPk(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Organisation non trouvé'
      });
    }
    
    // Vérifier si l'utilisateur est membre, sinon l'ajouter automatiquement
    const members = group.members || [];
    if (!members.includes(user.numeroH)) {
      members.push(user.numeroH);
      await group.update({ members });
    }
    
    // Gérer le fichier média si présent
    let mediaUrl = null;
    if (req.file) {
      mediaUrl = `/uploads/${req.file.filename}`;
    }
    
    // Créer le message
    const message = await ActivityMessage.create({
      groupId: id,
      numeroH: user.numeroH,
      messageType: messageType || 'text',
      category: category || 'information',
      content: content || '',
      mediaUrl
    });
    
    // Récupérer le nom de l'auteur
    const author = await User.findOne({ where: { numero_h: user.numeroH } });
    const authorName = author ? `${author.prenom} ${author.nom_famille}` : 'Utilisateur inconnu';
    
    res.status(201).json({
      success: true,
      message: {
        ...message.toJSON(),
        authorName
      }
    });
  } catch (error) {
    console.error('Erreur lors de la création du message:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création du message'
    });
  }
});

// @route   GET /api/activities/groups/:id/messages
// @desc    Récupérer les messages d'un organisation d'activité
// @access  Authentifié
router.get('/groups/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const group = await ActivityGroup.findByPk(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Organisation non trouvé'
      });
    }
    
    const members = group.members || [];
    if (!members.includes(req.user.numeroH)) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas membre de ce organisation'
      });
    }
    
    const messages = await ActivityMessage.getGroupMessages(id, parseInt(limit), parseInt(offset));
    
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

export default router;