import express from 'express';
import { Op } from 'sequelize';
import Friend from '../models/Friend.js';
import FriendRequest from '../models/FriendRequest.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import Notification from '../models/Notification.js';

const router = express.Router();

// Toutes les routes nécessitent l'authentification
router.use(authenticate);

// ─── GET /api/friends/list → liste des amis acceptés ─────────────────────────
router.get('/list', async (req, res) => {
  try {
    const numeroH = req.user.numeroH;
    const friendships = await Friend.findAll({
      where: {
        [Op.or]: [
          { userNumeroH: numeroH },
          { friendNumeroH: numeroH }
        ],
        status: 'accepted'
      },
      order: [['acceptedAt', 'DESC']]
    });

    // Pour chaque amitié, récupérer les infos complètes de l'ami
    const friendsWithInfo = await Promise.all(
      friendships.map(async (friendship) => {
        // Déterminer le numeroH de l'ami (l'autre côté de l'amitié)
        const friendNumeroH = friendship.userNumeroH === numeroH
          ? friendship.friendNumeroH
          : friendship.userNumeroH;

        const friendUser = await User.findByNumeroH(friendNumeroH);

        return {
          id: friendship.id,
          numeroH: friendNumeroH,
          prenom: friendUser?.prenom || '',
          nomFamille: friendUser?.nomFamille || '',
          status: friendship.status,
          requestedAt: friendship.requestedAt,
          acceptedAt: friendship.acceptedAt,
          mutualFriends: friendship.mutualFriends || 0,
          commonInterests: friendship.commonInterests || []
        };
      })
    );

    res.json({ success: true, friends: friendsWithInfo });
  } catch (error) {
    console.error('Erreur /friends/list:', error);
    res.status(500).json({ success: false, message: error.message || 'Erreur serveur' });
  }
});

// ─── GET /api/friends/requests → demandes en attente reçues ──────────────────
router.get('/requests', async (req, res) => {
  try {
    const requests = await FriendRequest.findAll({
      where: { toUser: req.user.numeroH, status: 'pending' },
      order: [['createdAt', 'DESC']]
    });

    // Enrichir avec les infos de l'expéditeur si fromUserName manquant
    const enriched = await Promise.all(requests.map(async (r) => {
      const data = r.toJSON();
      if (!data.fromUserName) {
        const sender = await User.findByNumeroH(data.fromUser);
        if (sender) {
          data.fromUserName = [sender.prenom, sender.nomFamille].filter(Boolean).join(' ') || data.fromUser;
        }
      }
      return data;
    }));

    res.json({ success: true, requests: enriched });
  } catch (error) {
    console.error('Erreur /friends/requests:', error);
    res.status(500).json({ success: false, message: error.message || 'Erreur serveur' });
  }
});

// ─── POST /api/friends/send-request → envoyer une demande d'amitié ───────────
router.post('/send-request', async (req, res) => {
  try {
    const fromUser = req.user.numeroH;
    const { toUser, message } = req.body;

    if (!toUser) {
      return res.status(400).json({ success: false, message: 'NumeroH du destinataire requis' });
    }

    const toUserTrimmed = toUser.trim();

    if (fromUser === toUserTrimmed) {
      return res.status(400).json({ success: false, message: 'Vous ne pouvez pas vous ajouter vous-même' });
    }

    // Vérifier que l'utilisateur destinataire existe
    const targetUser = await User.findByNumeroH(toUserTrimmed);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Aucun utilisateur trouvé avec ce NumeroH' });
    }

    // Vérifier si une demande est déjà en cours (dans les deux sens)
    const existingRequest = await FriendRequest.findOne({
      where: {
        [Op.or]: [
          { fromUser, toUser: toUserTrimmed, status: 'pending' },
          { fromUser: toUserTrimmed, toUser: fromUser, status: 'pending' }
        ]
      }
    });
    if (existingRequest) {
      return res.status(400).json({ success: false, message: 'Une demande d\'amitié est déjà en cours' });
    }

    // Vérifier s'ils sont déjà amis
    const alreadyFriends = await Friend.findOne({
      where: {
        [Op.or]: [
          { userNumeroH: fromUser, friendNumeroH: toUserTrimmed },
          { userNumeroH: toUserTrimmed, friendNumeroH: fromUser }
        ],
        status: 'accepted'
      }
    });
    if (alreadyFriends) {
      return res.status(400).json({ success: false, message: 'Vous êtes déjà amis' });
    }

    const fromUserName = [req.user.prenom, req.user.nomFamille].filter(Boolean).join(' ') || fromUser;

    const request = await FriendRequest.create({
      fromUser,
      fromUserName,
      toUser: toUserTrimmed,
      message: message?.trim() || null,
      status: 'pending'
    });

    // Notifier le destinataire
    try {
      await Notification.createNotification({
        recipientNumeroH: toUserTrimmed,
        type: 'friend_request',
        title: 'Nouvelle demande d\'amitié',
        message: `${fromUserName} vous a envoyé une demande d'amitié.`,
        relatedId: request.id
      });
    } catch (e) { console.error('Notif friend_request:', e.message); }

    res.status(201).json({ success: true, request, message: 'Demande d\'amitié envoyée' });
  } catch (error) {
    console.error('Erreur /friends/send-request:', error);
    res.status(500).json({ success: false, message: error.message || 'Erreur serveur' });
  }
});

// ─── POST /api/friends/respond-request → accepter ou rejeter une demande ─────
router.post('/respond-request', async (req, res) => {
  try {
    const { requestId, action } = req.body;
    if (!requestId || !action) {
      return res.status(400).json({ success: false, message: 'requestId et action requis' });
    }

    const request = await FriendRequest.findByPk(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Demande non trouvée' });
    }

    // Seul le destinataire peut répondre
    if (request.toUser !== req.user.numeroH) {
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    }

    const status = action === 'accept' ? 'accepted' : 'rejected';
    await request.update({ status });

    if (status === 'accepted') {
      // Vérifier qu'on n'a pas déjà une relation Friend entre ces deux personnes
      const existing = await Friend.findOne({
        where: {
          [Op.or]: [
            { userNumeroH: request.fromUser, friendNumeroH: request.toUser },
            { userNumeroH: request.toUser, friendNumeroH: request.fromUser }
          ]
        }
      });

      if (!existing) {
        await Friend.create({
          userNumeroH: request.fromUser,
          friendNumeroH: request.toUser,
          status: 'accepted',
          requestedAt: request.createdAt,
          acceptedAt: new Date(),
          mutualFriends: 0,
          commonInterests: []
        });
      }

      // Notifier l'expéditeur que sa demande a été acceptée
      const responderName = [req.user.prenom, req.user.nomFamille].filter(Boolean).join(' ') || req.user.numeroH;
      try {
        await Notification.createNotification({
          recipientNumeroH: request.fromUser,
          type: 'friend_accepted',
          title: 'Demande d\'amitié acceptée',
          message: `${responderName} a accepté votre demande d'amitié. Vous êtes maintenant amis !`,
          relatedId: request.id
        });
      } catch (e) { console.error('Notif friend_accepted:', e.message); }
    }

    res.json({ success: true, message: action === 'accept' ? 'Demande acceptée' : 'Demande rejetée' });
  } catch (error) {
    console.error('Erreur /friends/respond-request:', error);
    res.status(500).json({ success: false, message: error.message || 'Erreur serveur' });
  }
});

// ─── GET /api/friends/:numeroH → amis d'un utilisateur spécifique ────────────
// search-by-phone
router.get('/search-by-phone', async (req, res) => {
  try {
    const { tel } = req.query;
    if (!tel || tel.trim().length < 6) {
      return res.status(400).json({ success: false, message: 'Numéro requis (min. 6 chiffres)' });
    }
    const telClean = tel.trim().replace(/\s+/g, '');
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { tel1: { [Op.like]: '%' + telClean + '%' } },
          { tel2: { [Op.like]: '%' + telClean + '%' } }
        ],
        isActive: true
      },
      attributes: ['numeroH', 'prenom', 'nomFamille']
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Aucun utilisateur trouvé avec ce numéro' });
    }
    if (user.numeroH === req.user.numeroH) {
      return res.status(400).json({ success: false, message: "C'est votre propre numéro" });
    }
    res.json({ success: true, user: { numeroH: user.numeroH, prenom: user.prenom, nomFamille: user.nomFamille } });
  } catch (error) {
    console.error('Erreur /friends/search-by-phone:', error);
    res.status(500).json({ success: false, message: error.message || 'Erreur serveur' });
  }
});

// search-by-name
router.get('/search-by-name', async (req, res) => {
  try {
    const { prenom, nom } = req.query;
    if (!prenom?.trim() && !nom?.trim()) {
      return res.status(400).json({ success: false, message: 'Prénom ou nom requis' });
    }
    const where = { isActive: true };
    const andClauses = [];
    if (prenom?.trim()) andClauses.push({ prenom: { [Op.iLike]: '%' + prenom.trim() + '%' } });
    if (nom?.trim()) andClauses.push({ nomFamille: { [Op.iLike]: '%' + nom.trim() + '%' } });
    where[Op.and] = andClauses;
    const users = await User.findAll({
      where,
      attributes: ['numeroH', 'prenom', 'nomFamille'],
      limit: 10
    });
    const filtered = users.filter(u => u.numeroH !== req.user?.numeroH);
    if (!filtered.length) {
      return res.status(404).json({ success: false, message: 'Aucun utilisateur trouvé' });
    }
    res.json({ success: true, users: filtered });
  } catch (error) {
    console.error('Erreur /friends/search-by-name:', error);
    res.status(500).json({ success: false, message: error.message || 'Erreur serveur' });
  }
});

router.get('/:numeroH', async (req, res) => {
  try {
    const friends = await Friend.findAll({
      where: {
        [Op.or]: [
          { userNumeroH: req.params.numeroH },
          { friendNumeroH: req.params.numeroH }
        ],
        status: 'accepted'
      },
      order: [['acceptedAt', 'DESC']]
    });
    res.json({ success: true, friends });
  } catch (error) {
    console.error('Erreur lors de la récupération des amis:', error);
    res.status(500).json({ success: false, message: error.message || 'Erreur serveur' });
  }
});

// ─── DELETE /api/friends/:id → supprimer un ami ──────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const friend = await Friend.findByPk(req.params.id);
    if (!friend) {
      return res.status(404).json({ success: false, message: 'Ami non trouvé' });
    }
    await friend.destroy();
    res.json({ success: true, message: 'Ami supprimé' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'ami:', error);
    res.status(500).json({ success: false, message: error.message || 'Erreur serveur' });
  }
});

export default router;
