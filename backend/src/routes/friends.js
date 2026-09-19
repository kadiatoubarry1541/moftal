import express from 'express';
import multer from 'multer';
import { Op } from 'sequelize';
import Friend from '../models/Friend.js';
import FriendRequest from '../models/FriendRequest.js';
import FriendMessage from '../models/FriendMessage.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import Notification from '../models/Notification.js';
import { sequelize } from '../config/database.js';
import { uploadToImageKit } from '../services/imagekitStorage.js';
import { uploadToR2 } from '../services/r2Storage.js';
import { uploadToIDrive } from '../services/idriveStorage.js';
import { getIO } from '../socket.js';
import { FamilyTree } from '../models/additional.js';
import CoupleLink from '../models/CoupleLink.js';
import ParentChildLink from '../models/ParentChildLink.js';
import ResidenceGroup from '../models/ResidenceGroup.js';

// Upload en mémoire — jamais sur le disque du serveur — puis envoyé vers le stockage cloud.
const uploadFriendMedia = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const router = express.Router();

// Toutes les routes nécessitent l'authentification
router.use(authenticate);

// Crée la table friend_messages si elle n'existe pas (dev ET production)
async function ensureFriendMessagesTable() {
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "friend_messages" (
        "id"             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        "link_id"        UUID         NOT NULL,
        "numero_h"       VARCHAR(255) NOT NULL,
        "message_type"   VARCHAR(20)  DEFAULT 'text',
        "category"       VARCHAR(50)  DEFAULT 'information',
        "content"        TEXT         NOT NULL,
        "media_url"      TEXT,
        "created_at"     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "updated_at"     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
    `);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_fm_link ON "friend_messages" ("link_id");`).catch(() => {});
  } catch (err) {
    console.warn('⚠️ ensureFriendMessagesTable:', err.message);
  }
}

/** Vérifie que l'utilisateur fait bien partie de cette amitié. */
function estDansLAmitie(friend, numeroH) {
  return !!friend && (friend.userNumeroH === numeroH || friend.friendNumeroH === numeroH);
}

// Normalise un nom de lieu : minuscule + sans accents (même règle que résidences)
function normalizeLoc(str) {
  if (!str) return '';
  return str.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** NumeroH exclus de "famille élargie" : soi-même, parents, conjoint(s), enfants — ils ont déjà leur propre messagerie dédiée. */
async function getImmediateFamilyNumeroHs(numeroH) {
  const excluded = new Set([numeroH]);
  const [parentLinks, childLinks, coupleLinks] = await Promise.all([
    ParentChildLink.getMyParents(numeroH),
    ParentChildLink.getMyChildren(numeroH),
    CoupleLink.findAll({
      where: {
        [Op.or]: [{ husbandNumeroH: numeroH }, { wifeNumeroH: numeroH }],
        status: 'active', isActive: true, isArchived: false
      }
    })
  ]);
  parentLinks.forEach(l => excluded.add(l.parentNumeroH));
  childLinks.forEach(l => excluded.add(l.childNumeroH));
  coupleLinks.forEach(l => excluded.add(l.husbandNumeroH === numeroH ? l.wifeNumeroH : l.husbandNumeroH));
  return excluded;
}

/** Arbre familial (élargi) de l'utilisateur, ou null. */
async function findMyFamilyTree(numeroH) {
  return FamilyTree.findOne({
    where: {
      [Op.or]: [
        { rootMember: numeroH },
        { members: { [Op.contains]: [numeroH] } },
        { chefFamille1: numeroH },
        { chefFamille2: numeroH }
      ],
      isActive: true
    }
  });
}

/** Groupes de quartier (Terre ADAM) de l'utilisateur, d'après ses lieux de résidence enregistrés. */
async function findMyQuartierGroups(user) {
  const locations = [user?.lieu1, user?.lieu2, user?.lieu3].map(normalizeLoc).filter(Boolean);
  if (locations.length === 0) return [];
  return ResidenceGroup.findAll({ where: { location: { [Op.in]: locations }, isActive: true } });
}

/** Admin : aucune condition, tout voir et tout gérer (y compris son propre espace de démo). */
function isAdmin(user) {
  return !!(
    user &&
    (
      user.role === 'admin' ||
      user.role === 'super-admin' ||
      user.numeroH === 'G7C7P7R7E7F7 7' ||
      user.numeroH === 'G0C0P0R0E0F0 0' ||
      user.bypassRestrictions
    )
  );
}

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
          profilePicture: friendUser?.photo || null,
          activite1: friendUser?.activite1 || null,
          vitrinePhoto1: friendUser?.vitrinePhoto1 || null,
          vitrinePhoto2: friendUser?.vitrinePhoto2 || null,
          vitrineVideo: friendUser?.vitrineVideo || null,
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

    // Vérifier que l'utilisateur destinataire existe et récupérer son NumeroH
    // canonique (tel qu'enregistré en base) : le texte saisi/scanné par
    // l'expéditeur peut différer légèrement (espaces, casse) de la valeur
    // stockée, et un simple trim() ne suffit pas à les faire correspondre.
    // Si on stockait toUserTrimmed tel quel, la requête GET /requests du
    // destinataire — qui compare toUser à son numeroH canonique par égalité
    // stricte — ne la retrouverait jamais : la demande semblerait "perdue".
    const targetUser = await User.findByNumeroH(toUserTrimmed);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Aucun utilisateur trouvé avec ce NumeroH' });
    }
    const toUserCanonical = targetUser.numeroH;

    if (fromUser === toUserCanonical) {
      return res.status(400).json({ success: false, message: 'Vous ne pouvez pas vous ajouter vous-même' });
    }

    // Vérifier si une demande est déjà en cours (dans les deux sens)
    const existingRequest = await FriendRequest.findOne({
      where: {
        [Op.or]: [
          { fromUser, toUser: toUserCanonical, status: 'pending' },
          { fromUser: toUserCanonical, toUser: fromUser, status: 'pending' }
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
          { userNumeroH: fromUser, friendNumeroH: toUserCanonical },
          { userNumeroH: toUserCanonical, friendNumeroH: fromUser }
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
      toUser: toUserCanonical,
      message: message?.trim() || null,
      status: 'pending'
    });

    // Notifier le destinataire
    try {
      await Notification.createNotification({
        recipientNumeroH: toUserCanonical,
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

// POST /api/friends/match-phones — { phones: string[] } → comptes Moftal déjà présents
// dans les contacts du téléphone, pour les proposer en ajout direct (pas déjà amis).
router.post('/match-phones', async (req, res) => {
  try {
    const numeroH = req.user.numeroH;
    const phones = Array.isArray(req.body?.phones) ? req.body.phones : [];
    const cleaned = [...new Set(
      phones.map(p => String(p || '').trim().replace(/\s+/g, '')).filter(p => p.length >= 6)
    )].slice(0, 200);
    if (cleaned.length === 0) return res.json({ success: true, matches: [] });

    const orConditions = cleaned.flatMap(p => [
      { tel1: { [Op.like]: '%' + p + '%' } },
      { tel2: { [Op.like]: '%' + p + '%' } }
    ]);
    const users = await User.findAll({
      where: { [Op.or]: orConditions, isActive: true, numeroH: { [Op.ne]: numeroH } },
      attributes: ['numeroH', 'prenom', 'nomFamille', 'photo'],
      limit: 200
    });

    // Exclut ceux déjà amis ou avec une demande en attente (rien à "ajouter" pour eux)
    const [existingFriends, pendingRequests] = await Promise.all([
      Friend.findAll({ where: { [Op.or]: [{ userNumeroH: numeroH }, { friendNumeroH: numeroH }] } }),
      FriendRequest.findAll({ where: { [Op.or]: [{ fromUser: numeroH }, { toUser: numeroH }], status: 'pending' } })
    ]);
    const excluded = new Set();
    existingFriends.forEach(f => excluded.add(f.userNumeroH === numeroH ? f.friendNumeroH : f.userNumeroH));
    pendingRequests.forEach(r => excluded.add(r.fromUser === numeroH ? r.toUser : r.fromUser));

    res.json({
      success: true,
      matches: users.filter(u => !excluded.has(u.numeroH)).map(u => ({
        numeroH: u.numeroH, prenom: u.prenom, nomFamille: u.nomFamille, photo: u.photo
      }))
    });
  } catch (error) {
    console.error('Erreur /friends/match-phones:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// search-by-email
router.get('/search-by-email', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email requis' });
    }
    const user = await User.findOne({
      where: { email: { [Op.iLike]: email.trim() }, isActive: true },
      attributes: ['numeroH', 'prenom', 'nomFamille']
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Aucun utilisateur trouvé avec cet email' });
    }
    if (user.numeroH === req.user.numeroH) {
      return res.status(400).json({ success: false, message: "C'est votre propre email" });
    }
    res.json({ success: true, user: { numeroH: user.numeroH, prenom: user.prenom, nomFamille: user.nomFamille } });
  } catch (error) {
    console.error('Erreur /friends/search-by-email:', error);
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

// ─── CONVERSATION PRIVÉE (bouton messagerie flottant : Arbre, Quartier, Amitié) —
// déclarées avant "/:numeroH" ci-dessous, sinon cette route générique les capterait. ───

// GET /api/friends/family-contacts — famille élargie, hors parents/conjoint(s)/enfants
router.get('/family-contacts', async (req, res) => {
  try {
    const numeroH = req.user.numeroH;
    const tree = await findMyFamilyTree(numeroH);
    if (!tree) return res.json({ success: true, contacts: [] });

    const excluded = await getImmediateFamilyNumeroHs(numeroH);
    const memberNumeroHs = (tree.members || []).filter(nh => !excluded.has(nh));
    if (memberNumeroHs.length === 0) return res.json({ success: true, contacts: [] });

    const users = await User.findAll({
      where: { numeroH: { [Op.in]: memberNumeroHs } },
      attributes: ['numeroH', 'prenom', 'nomFamille', 'photo']
    });
    res.json({ success: true, contacts: users });
  } catch (error) {
    console.error('Erreur /friends/family-contacts:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/friends/quartier-contacts — membres du/des même(s) quartier(s)
router.get('/quartier-contacts', async (req, res) => {
  try {
    const numeroH = req.user.numeroH;
    const user = await User.findOne({ where: { numeroH } });
    const groups = await findMyQuartierGroups(user);
    const memberNumeroHs = [...new Set(groups.flatMap(g => g.members || []))].filter(nh => nh !== numeroH);
    if (memberNumeroHs.length === 0) return res.json({ success: true, contacts: [] });

    const users = await User.findAll({
      where: { numeroH: { [Op.in]: memberNumeroHs } },
      attributes: ['numeroH', 'prenom', 'nomFamille', 'photo']
    });
    res.json({ success: true, contacts: users });
  } catch (error) {
    console.error('Erreur /friends/quartier-contacts:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/friends/activity-contacts — utilisateurs de la même activité
router.get('/activity-contacts', async (req, res) => {
  try {
    const numeroH = req.user.numeroH;
    const user = await User.findOne({ where: { numeroH } });
    const activite1 = (user?.activite1 || '').trim();
    if (!activite1) return res.json({ success: true, contacts: [] });

    const users = await User.findAll({
      where: { activite1, numeroH: { [Op.ne]: numeroH } },
      attributes: ['numeroH', 'prenom', 'nomFamille', 'photo', 'activite1'],
      limit: 100
    });
    res.json({ success: true, contacts: users });
  } catch (error) {
    console.error('Erreur /friends/activity-contacts:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/friends/start-conversation — { toUser } → crée/réutilise un lien de
// discussion privée si le destinataire fait partie d'une des 3 catégories
// autorisées (famille élargie hors immédiate, quartier, même activité).
router.post('/start-conversation', async (req, res) => {
  try {
    const numeroH = req.user.numeroH;
    const { toUser } = req.body;
    if (!toUser || toUser === numeroH) {
      return res.status(400).json({ success: false, message: 'Destinataire invalide' });
    }
    const [me, target] = await Promise.all([
      User.findOne({ where: { numeroH } }),
      User.findOne({ where: { numeroH: toUser } })
    ]);
    if (!target) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });

    let eligible = false;

    // 1) Même activité
    if (me?.activite1 && target.activite1 && me.activite1.trim() === target.activite1.trim()) {
      eligible = true;
    }

    // 2) Même quartier
    if (!eligible) {
      const groups = await findMyQuartierGroups(me);
      if (groups.some(g => (g.members || []).includes(toUser))) eligible = true;
    }

    // 3) Famille élargie, hors parents/conjoint(s)/enfants (déjà leur propre messagerie)
    if (!eligible) {
      const tree = await findMyFamilyTree(numeroH);
      if (tree && (tree.members || []).includes(toUser)) {
        const excluded = await getImmediateFamilyNumeroHs(numeroH);
        if (!excluded.has(toUser)) eligible = true;
      }
    }

    if (!eligible) {
      return res.status(403).json({ success: false, message: 'Vous ne pouvez pas encore discuter avec cette personne.' });
    }

    let friend = await Friend.findOne({
      where: {
        [Op.or]: [
          { userNumeroH: numeroH, friendNumeroH: toUser },
          { userNumeroH: toUser, friendNumeroH: numeroH }
        ]
      }
    });
    if (!friend) {
      friend = await Friend.create({
        userNumeroH: numeroH,
        friendNumeroH: toUser,
        status: 'accepted',
        acceptedAt: new Date()
      });
    }

    res.json({
      success: true,
      linkId: friend.id,
      partner: { numeroH: target.numeroH, prenom: target.prenom, nomFamille: target.nomFamille }
    });
  } catch (error) {
    console.error('Erreur /friends/start-conversation:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ─── MESSAGERIE PRIVÉE ENTRE AMIS (par amitié précise) — déclarée avant
// "/:numeroH" ci-dessous, sinon cette route générique capterait "/messages". ───

// GET /api/friends/messages?linkId=
router.get('/messages', async (req, res) => {
  try {
    await ensureFriendMessagesTable();
    const { linkId } = req.query;
    if (!linkId) return res.status(400).json({ success: false, message: 'linkId requis.' });
    const friend = await Friend.findByPk(linkId);
    if (!estDansLAmitie(friend, req.user.numeroH) && !isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }
    const messages = await FriendMessage.getMessages(linkId);
    const numeroHs = [...new Set(messages.map(m => m.numeroH))];
    const users = await User.findAll({ where: { numeroH: numeroHs }, attributes: ['numeroH', 'prenom', 'nomFamille'] });
    const userMap = Object.fromEntries(users.map(u => [u.numeroH, u]));
    const list = messages.slice().reverse().map(m => ({
      ...m.toJSON(),
      authorName: userMap[m.numeroH] ? `${userMap[m.numeroH].prenom} ${userMap[m.numeroH].nomFamille}` : m.numeroH
    }));
    res.json({ success: true, messages: list });
  } catch (error) {
    console.error('Erreur récupération messages amis:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/friends/messages — message texte
router.post('/messages', async (req, res) => {
  try {
    await ensureFriendMessagesTable();
    const user = req.user;
    const { linkId, content, category = 'information' } = req.body;
    if (!linkId || !content?.trim()) {
      return res.status(400).json({ success: false, message: 'linkId et content requis.' });
    }
    const friend = await Friend.findByPk(linkId);
    if (!estDansLAmitie(friend, user.numeroH) && !isAdmin(user)) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }
    const msg = await FriendMessage.create({
      linkId,
      numeroH: user.numeroH,
      messageType: 'text',
      category,
      content: content.trim()
    });
    const msgData = { ...msg.toJSON(), authorName: `${user.prenom} ${user.nomFamille}` };
    const io = getIO();
    if (io) io.to(`friend-${linkId}`).emit('friend-message', msgData);
    res.status(201).json({ success: true, message: msgData });
  } catch (error) {
    console.error('Erreur envoi message ami:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/friends/messages/upload — photo/vidéo/audio (≤30s côté client)
router.post('/messages/upload', uploadFriendMedia.single('media'), async (req, res) => {
  try {
    await ensureFriendMessagesTable();
    const user = req.user;
    const { linkId, category = 'information' } = req.body;
    if (!linkId) return res.status(400).json({ success: false, message: 'linkId requis.' });
    const friend = await Friend.findByPk(linkId);
    if (!estDansLAmitie(friend, user.numeroH) && !isAdmin(user)) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }
    if (!req.file) return res.status(400).json({ success: false, message: 'Aucun fichier reçu.' });

    const mime = req.file.mimetype;
    let messageType = 'image';
    if (mime.startsWith('video/')) messageType = 'video';
    else if (mime.startsWith('audio/')) messageType = 'audio';

    const mediaUrl = messageType === 'image'
      ? await uploadToImageKit(req.file.buffer, req.file.originalname, 'friend-messages')
      : await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype, 'friend-messages');
    uploadToIDrive(req.file.buffer, req.file.originalname, req.file.mimetype, 'friend-messages').catch(() => {});

    const content = req.body.content || (messageType === 'audio' ? '🎤 Message vocal' : messageType === 'video' ? '🎬 Vidéo' : '📷 Photo');

    const msg = await FriendMessage.create({
      linkId,
      numeroH: user.numeroH,
      messageType,
      category,
      content,
      mediaUrl
    });
    const msgData = { ...msg.toJSON(), authorName: `${user.prenom} ${user.nomFamille}` };
    const io = getIO();
    if (io) io.to(`friend-${linkId}`).emit('friend-message', msgData);
    res.status(201).json({ success: true, message: msgData });
  } catch (error) {
    console.error('Erreur upload message ami:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
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
