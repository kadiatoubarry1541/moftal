import express from 'express';
import { Op } from 'sequelize';
import ActivityGroup from '../models/ActivityGroup.js';
import ActivityMessage from '../models/ActivityMessage.js';
import User from '../models/User.js';
import { authenticate, isProvisionalNumeroH } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import { urlDurable } from '../services/stockageDurable.js';
import { notifierNouveauMessage } from '../services/notificationMessages.js';

const router = express.Router();

// Toutes les routes nécessitent l'authentification
router.use(authenticate);

// @route   GET /api/activities/my-group
// @desc    Trouver ou créer le groupe de l'utilisateur pour son activité (niveau 1, 2 ou 3)
//          et l'y ajouter automatiquement
// @access  Authentifié
router.get('/my-group', async (req, res) => {
  try {
    const level = parseInt(req.query.level) || 1;
    if (level < 1 || level > 3) {
      return res.status(400).json({ success: false, message: 'level doit être 1, 2 ou 3' });
    }

    const activityKey  = `activite${level}`;                  // 'activite1', 'activite2', 'activite3'
    const activityType = `Activité${level}`;                  // 'Activité1', 'Activité2', 'Activité3'

    const userRecord = await User.findOne({ where: { numero_h: req.user.numeroH } });
    const activityValue = userRecord ? userRecord[activityKey] : null;

    // Compte pas encore mis à jour : il n'est ajouté à aucun groupe
    if (isProvisionalNumeroH(req.user.numeroH)) {
      return res.json({ success: true, group: null, activityValue: null, profileIncomplete: true,
        message: 'Mettez votre profil à jour pour rejoindre le groupe de votre activité.' });
    }

    if (!activityValue) {
      return res.json({ success: true, group: null, activityValue: null,
        message: `Aucune activité définie pour le niveau ${level}` });
    }

    // Chercher le groupe correspondant à cette activité exacte
    let group = await ActivityGroup.findOne({
      where: { activity: activityType, name: activityValue, isActive: true }
    });

    if (!group) {
      // Créer le groupe si personne ne l'a encore créé
      group = await ActivityGroup.create({
        name: activityValue,
        description: `Groupe des personnes ayant l'activité : ${activityValue}`,
        activity: activityType,
        members: [req.user.numeroH],
        posts: [],
        createdBy: req.user.numeroH,
        pays: userRecord?.pays || ''
      });
    } else {
      // Auto-rejoindre si pas encore membre
      const members = group.members || [];
      if (!members.includes(req.user.numeroH)) {
        members.push(req.user.numeroH);
        await group.update({ members });
      }
    }

    res.json({ success: true, group, activityValue });
  } catch (error) {
    console.error('Erreur my-group activité:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

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
        ...(pays ? [[ActivityGroup.sequelize.literal(`CASE WHEN pays = ${ActivityGroup.sequelize.escape(String(pays))} THEN 0 ELSE 1 END`), 'ASC']] : []),
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
    const { name, description, activity, pays } = req.body;

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
      // Le créateur est toujours l'utilisateur connecté (jamais une valeur du body)
      members: [req.user.numeroH],
      posts: [],
      createdBy: req.user.numeroH
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
    // On rejoint toujours en son propre nom (jamais un numeroH du body)
    const numeroH = req.user.numeroH;
    const group = await ActivityGroup.findByPk(req.params.id);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Organisation non trouvé'
      });
    }
    
    const members = group.members || [];
    if (!members.includes(numeroH)) {
      await group.update({ members: [...members, numeroH] });
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
      mediaUrl = await urlDurable(req.file, 'activites');
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
    notifierNouveauMessage({ destinataires: group.members || [], expediteur: user, convKey: `activity:${group.id}`, message, groupe: group.name || group.activity || 'Activité' });
    
    // Récupérer le nom de l'auteur
    const author = await User.findOne({ where: { numero_h: user.numeroH } });
    const authorName = author ? `${author.prenom} ${author.nomFamille}` : 'Utilisateur inconnu';
    
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

// ========== PUBLICATIONS DES GROUPES (Activités 2 et 3) ==========
// Rangées dans group.posts (ce que les pages lisent). Les détails d'un atelier,
// d'une collaboration, d'une exposition, d'un spectacle ou d'un projet sont
// gardés avec leur liste d'inscrits, qui commence toujours vide.
const DETAILS = {
  workshop:      { cle: 'workshopDetails',      liste: 'participants', max: 'maxParticipants' },
  collaboration: { cle: 'collaborationDetails', liste: 'participants', max: null },
  exhibition:    { cle: 'exhibitionDetails',    liste: 'artists',      max: 'maxArtists' },
  performance:   { cle: 'performanceDetails',   liste: 'performers',   max: 'maxPerformers' },
  project:       { cle: 'projectDetails',       liste: 'participants', max: null },
};
const lireJson = (v) => { if (!v) return null; if (typeof v === 'object') return v; try { return JSON.parse(v); } catch { return null; } };

// @route   POST /api/activities/groups/:id/posts — publier dans son groupe
router.post('/groups/:id/posts', upload.single('media'), async (req, res) => {
  try {
    const user = req.user;
    const type = String(req.body?.type || 'text');
    const content = String(req.body?.content || '').slice(0, 10000);
    const mediaUrl = req.file ? await urlDurable(req.file, 'activites') : null;
    if (!content.trim() && !mediaUrl && !DETAILS[type]) {
      return res.status(400).json({ success: false, message: 'Publication vide.' });
    }
    const author = await User.findOne({ where: { numero_h: user.numeroH }, attributes: ['prenom', 'nomFamille'] });
    const post = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      author: user.numeroH,
      authorName: author ? `${author.prenom || ''} ${author.nomFamille || ''}`.trim() : user.numeroH,
      content, type, mediaUrl, likes: [], comments: [], createdAt: new Date().toISOString(),
    };
    const d = DETAILS[type];
    if (d) {
      const details = lireJson(req.body?.[d.cle]) || {};
      post[d.cle] = { ...details, [d.liste]: [] };
    }
    const resultat = await ActivityGroup.sequelize.transaction(async (transaction) => {
      const group = await ActivityGroup.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!group) return { statut: 404, message: 'Organisation non trouvé' };
      if (!(group.members || []).includes(user.numeroH)) return { statut: 403, message: 'Rejoignez le groupe pour publier.' };
      await group.update({ posts: [post, ...(group.posts || [])] }, { transaction });
      return { group };
    });
    if (resultat.statut) return res.status(resultat.statut).json({ success: false, message: resultat.message });
    res.status(201).json({ success: true, post });
  } catch (error) {
    console.error('activities posts POST:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// @route   POST /api/activities/:niveau/posts/:postId/:action — s'inscrire (en son nom)
const ACTIONS = { 'join-workshop': 'workshop', 'join-collaboration': 'collaboration', 'join-exhibition': 'exhibition', 'join-performance': 'performance', 'join-project': 'project' };
router.post('/:niveau(activity2|activity3)/posts/:postId/:action', async (req, res) => {
  try {
    const type = ACTIONS[req.params.action];
    if (!type) return res.status(404).json({ success: false, message: 'Action inconnue.' });
    const d = DETAILS[type];
    const moi = req.user.numeroH;
    const activite = req.params.niveau === 'activity2' ? 'Activité2' : 'Activité3';
    const resultat = await ActivityGroup.sequelize.transaction(async (transaction) => {
      const groupes = await ActivityGroup.findAll({ where: { activity: activite, isActive: true }, transaction });
      const groupe = groupes.find((g) => (g.members || []).includes(moi) && (g.posts || []).some((p) => p.id === req.params.postId));
      if (!groupe) return { statut: 404, message: 'Publication introuvable dans vos groupes.' };
      const g = await ActivityGroup.findByPk(groupe.id, { transaction, lock: transaction.LOCK.UPDATE });
      const posts = (g.posts || []).map((p) => ({ ...p }));
      const post = posts.find((p) => p.id === req.params.postId);
      if (!post || post.type !== type || !post[d.cle]) return { statut: 400, message: 'Cette publication ne permet pas cette inscription.' };
      const details = { ...post[d.cle] };
      const liste = Array.isArray(details[d.liste]) ? [...details[d.liste]] : [];
      if (liste.includes(moi)) return { statut: 200, post };
      const max = d.max ? Number(details[d.max]) : 0;
      if (max > 0 && liste.length >= max) return { statut: 409, message: 'Complet : plus de place disponible.' };
      details[d.liste] = [...liste, moi];
      post[d.cle] = details;
      await g.update({ posts }, { transaction });
      return { statut: 200, post };
    });
    if (resultat.statut !== 200) return res.status(resultat.statut).json({ success: false, message: resultat.message });
    res.json({ success: true, post: resultat.post });
  } catch (error) {
    console.error('activities join POST:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
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
          authorName: user ? `${user.prenom} ${user.nomFamille}` : 'Utilisateur inconnu'
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