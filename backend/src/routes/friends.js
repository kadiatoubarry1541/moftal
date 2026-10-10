import express from 'express';
import multer from 'multer';
import { Op } from 'sequelize';
import Friend from '../models/Friend.js';
import FriendRequest from '../models/FriendRequest.js';
import FriendMessage from '../models/FriendMessage.js';
import User from '../models/User.js';
import { authenticate, ensureNumeroHAliasTable, MASTER_ADMIN_NUMEROS } from '../middleware/auth.js';
import { normalizeNumeroH } from '../utils/numeroH.js';
import jwt from 'jsonwebtoken';
import { config } from '../../config.js';
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
import { notifierNouveauMessage } from '../services/notificationMessages.js';

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

/**
 * Accès modération Amitié — réservé au chef unique (G7), pour voir qui est
 * en lien avec qui (sécurité des utilisateurs). Ne donne accès qu'à la liste
 * des relations (/admin/all-links) — jamais au contenu des messages privés,
 * qui reste strictement réservé aux deux personnes concernées.
 */
function isAdmin(user) {
  return !!(user && user.numeroH === 'G7C7P7R7E7F7 7');
}

/** Admin maître ou compte ayant un rôle d'administration. */
function estAdminOuRole(user) {
  return isAdmin(user) || ['admin', 'super-admin', 'superadmin', 'administrator'].includes(String(user?.role || '').toLowerCase());
}

/**
 * Comptes de l'administration : secrets, jamais montrés ni trouvables par les
 * membres (suggestions, recherches par nom / téléphone / e-mail / NuméroH).
 * Rôle admin, NuméroH maîtres, ou NuméroH de génération réservée G0–G90
 * (aucun vivant ne peut l'avoir : les vivants sont en G96).
 */
const ROLES_ADMIN = ['admin', 'super-admin', 'superadmin', 'administrator'];
const RESERVE_RE = /^G([0-9]|[1-8][0-9]|90)C/i;
function estCompteAdmin(u) {
  if (!u) return false;
  return ROLES_ADMIN.includes(String(u.role || '').toLowerCase())
    || MASTER_ADMIN_NUMEROS.includes(u.numeroH)
    || RESERVE_RE.test(String(u.numeroH || ''));
}
// Même règle en SQL (prefixe = alias de table, ex. '"User".')
const sansComptesAdmin = (prefixe = '') => `NOT (
  LOWER(COALESCE(${prefixe}role, 'user')) IN (${ROLES_ADMIN.map((x) => `'${x}'`).join(', ')})
  OR ${prefixe}numero_h IN (${MASTER_ADMIN_NUMEROS.map((x) => `'${x}'`).join(', ')})
  OR ${prefixe}numero_h ~* '^G([0-9]|[1-8][0-9]|90)C')`;

/**
 * Comptes Moftal dont le numéro (tel1 ou tel2) correspond — on compare les chiffres
 * seulement, sur les 9 derniers (comme la connexion) : « +224 620 00 00 00 »,
 * « 620-00-00-00 » et « 620000000 » sont le même numéro.
 */
async function numerosHParTelephones(telephones, exclu) {
  const fins = [...new Set(
    telephones.map((t) => String(t || '').replace(/[^0-9]/g, '')).filter((d) => d.length >= 6).map((d) => d.slice(-9))
  )].slice(0, 200);
  if (fins.length === 0) return [];
  const replacements = { exclu: exclu || '' };
  const conditions = fins.map((f, i) => {
    replacements[`f${i}`] = f;
    return `RIGHT(REGEXP_REPLACE(COALESCE(tel1, ''), '[^0-9]', '', 'g'), LENGTH(:f${i})) = :f${i}
         OR RIGHT(REGEXP_REPLACE(COALESCE(tel2, ''), '[^0-9]', '', 'g'), LENGTH(:f${i})) = :f${i}`;
  });
  const rows = await sequelize.query(
    `SELECT numero_h FROM users
     WHERE is_active = true AND numero_h <> :exclu AND ${sansComptesAdmin()} AND (${conditions.join(' OR ')})
     LIMIT 200`,
    { replacements, type: 'SELECT' }
  );
  return rows.map((row) => row.numero_h);
}

/** Compte par e-mail : comparaison exacte, sans tenir compte des majuscules. */
async function utilisateurParEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  if (!e.includes('@')) return null;
  return User.findOne({ where: { [Op.and]: [sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), e), { isActive: true }, sequelize.literal(sansComptesAdmin('"User".'))] } });
}

/**
 * Retrouve la personne à ajouter à partir de ce qui a été saisi : NuméroH,
 * e-mail ou numéro de téléphone — les trois marchent partout.
 */
async function trouverDestinataire(saisie, moi, moiUser) {
  const texte = String(saisie || '').trim();
  if (!texte) return null;
  if (texte.includes('@')) return utilisateurParEmail(texte);
  const parNumeroH = await User.findByNumeroH(texte) || await User.findByNumeroH(normalizeNumeroH(texte));
  if (parNumeroH) return estCompteAdmin(parNumeroH) && !estCompteAdmin(moiUser) ? null : parNumeroH;
  // Un numéro de téléphone : surtout des chiffres (+, espaces, tirets permis)
  if (/^[+\d\s().-]+$/.test(texte) && texte.replace(/[^0-9]/g, '').length >= 6) {
    const [numeroH] = await numerosHParTelephones([texte], moi);
    return numeroH ? User.findByNumeroH(numeroH) : null;
  }
  return null;
}

// Code protégé d'une suggestion : permet d'inviter quelqu'un sans exposer son
// NuméroH quand il a choisi de le cacher (treeVisibility).
const signerSuggestion = (numeroH) => jwt.sign({ s: numeroH }, config.JWT_SECRET, { expiresIn: '30d' });
function lireSuggestion(ref) {
  try { return jwt.verify(String(ref), config.JWT_SECRET)?.s || null; } catch { return null; }
}

/**
 * Demandes d'amitié envoyées à (ou par) un compte provisoire TMP-… qui a depuis
 * reçu son vrai NuméroH : on les rattache au NuméroH actuel, sinon personne ne
 * les voit plus. Fait une fois par démarrage du serveur.
 */
let reparationDemandes = null;
function reparerDemandesAnciensIdentifiants() {
  if (!reparationDemandes) {
    reparationDemandes = (async () => {
      try {
        await ensureNumeroHAliasTable();
        for (const col of ['to_user', 'from_user']) {
          await sequelize.query(
            `UPDATE friend_requests fr SET ${col} = a.nouveau FROM numero_h_aliases a WHERE fr.${col} = a.ancien`
          );
        }
      } catch (err) {
        console.warn('⚠️ réparation demandes d\'amitié:', err.message);
        reparationDemandes = null;
      }
    })();
  }
  return reparationDemandes;
}
router.use((req, res, next) => { reparerDemandesAnciensIdentifiants().finally(next); });

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
      // Colonne réelle « created_at » (createdAt est renommé dans le modèle) :
      // trier sur « createdAt » faisait échouer la requête → aucune demande affichée.
      order: [['created_at', 'DESC']]
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
    const { message, ref } = req.body;
    // Invitation depuis « Personnes que vous pourriez connaître » : code protégé
    const toUser = ref ? lireSuggestion(ref) : req.body.toUser;

    if (!toUser) {
      return res.status(400).json({ success: false, message: 'NuméroH, e-mail ou téléphone du destinataire requis' });
    }

    const toUserTrimmed = toUser.trim();

    // Vérifier que l'utilisateur destinataire existe et récupérer son NumeroH
    // canonique (tel qu'enregistré en base) : le texte saisi/scanné par
    // l'expéditeur peut différer légèrement (espaces, casse) de la valeur
    // stockée, et un simple trim() ne suffit pas à les faire correspondre.
    // Si on stockait toUserTrimmed tel quel, la requête GET /requests du
    // destinataire — qui compare toUser à son numeroH canonique par égalité
    // stricte — ne la retrouverait jamais : la demande semblerait "perdue".
    const targetUser = await trouverDestinataire(toUserTrimmed, fromUser, req.user);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Aucun utilisateur trouvé avec ce NuméroH, cet e-mail ou ce numéro de téléphone' });
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

// ─── GET /api/friends/suggestions → « Personnes que vous pourriez connaître » ─
// Les membres inscrits se voient dans Amitié pour s'inviter facilement (comme
// Facebook). Exclus : soi-même, amis, demandes en cours, comptes provisoires
// (profil pas encore complété) et comptes désactivés. Les plus proches d'abord :
// même quartier, même nom de famille, même activité, même région, même pays.
// Jamais de téléphone ni d'e-mail ; photo et NuméroH selon le choix de chacun.
router.get('/suggestions', async (req, res) => {
  try {
    const me = req.user;
    const numeroH = me.numeroH;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    const [liens, demandes] = await Promise.all([
      Friend.findAll({ where: { [Op.or]: [{ userNumeroH: numeroH }, { friendNumeroH: numeroH }] }, attributes: ['userNumeroH', 'friendNumeroH'] }),
      FriendRequest.findAll({ where: { [Op.or]: [{ fromUser: numeroH }, { toUser: numeroH }], status: 'pending' }, attributes: ['fromUser', 'toUser'] })
    ]);
    const exclus = new Set([numeroH]);
    liens.forEach((f) => exclus.add(f.userNumeroH === numeroH ? f.friendNumeroH : f.userNumeroH));
    demandes.forEach((d) => exclus.add(d.fromUser === numeroH ? d.toUser : d.fromUser));

    // Score de proximité (colonnes réelles lues dans le modèle)
    const col = (a) => `"User"."${User.rawAttributes[a].field || a}"`;
    const norm = (a) => `LOWER(TRIM(COALESCE(${col(a)}, '')))`;
    const val = (v) => String(v || '').trim().toLowerCase();
    const parts = [];
    const mesLieux = [me.lieu1, me.lieu2, me.lieu3].map(val).filter(Boolean);
    if (mesLieux.length && ['lieu1', 'lieu2', 'lieu3'].every((a) => User.rawAttributes[a])) {
      const liste = mesLieux.map((l) => sequelize.escape(l)).join(', ');
      parts.push(`CASE WHEN ${norm('lieu1')} IN (${liste}) OR ${norm('lieu2')} IN (${liste}) OR ${norm('lieu3')} IN (${liste}) THEN 4 ELSE 0 END`);
    }
    for (const [attr, poids] of [['nomFamille', 3], ['activite1', 2], ['regionOrigine', 1], ['pays', 1]]) {
      if (!User.rawAttributes[attr]) continue;
      const v = val(me[attr]);
      if (v && !(attr === 'nomFamille' && v === 'membre')) parts.push(`CASE WHEN ${norm(attr)} = ${sequelize.escape(v)} THEN ${poids} ELSE 0 END`);
    }
    const score = parts.length ? parts.join(' + ') : '0';

    const users = await User.findAll({
      where: {
        numeroH: { [Op.notIn]: [...exclus], [Op.notLike]: 'TMP-%' },
        isActive: true,
        [Op.and]: [sequelize.literal(sansComptesAdmin('"User".'))]
      },
      attributes: ['numeroH', 'prenom', 'nomFamille', 'photo', 'activite1', 'lieu1', 'lieu2', 'lieu3', 'treeVisibility'],
      order: [[sequelize.literal(score), 'DESC'], ['created_at', 'DESC']],
      limit: limit + 1,
      offset
    });

    const mesLieuxSet = new Set(mesLieux);
    const suggestions = users.slice(0, limit).map((u) => {
      const vis = u.treeVisibility || 'name_photo_numeroH';
      const raison = [u.lieu1, u.lieu2, u.lieu3].map(val).some((l) => l && mesLieuxSet.has(l)) ? 'Même quartier'
        : val(u.nomFamille) && val(u.nomFamille) === val(me.nomFamille) ? 'Même famille'
        : val(u.activite1) && val(u.activite1) === val(me.activite1) ? 'Même activité'
        : null;
      return {
        ref: signerSuggestion(u.numeroH),
        numeroH: vis === 'name_photo_numeroH' ? u.numeroH : null,
        prenom: u.prenom,
        nomFamille: u.nomFamille,
        photo: vis === 'name_only' ? null : u.photo || null,
        activite1: u.activite1 || null,
        raison
      };
    });
    res.json({ success: true, suggestions, hasMore: users.length > limit });
  } catch (error) {
    console.error('Erreur /friends/suggestions:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ─── GET /api/friends/:numeroH → amis d'un utilisateur spécifique ────────────
// GET /api/friends/trouver-personne?q=… — retrouve un compte Moftal avec son
// NuméroH, son numéro de téléphone OU son e-mail (formulaires d'ajout de la famille).
router.get('/trouver-personne', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 3) return res.status(400).json({ success: false, message: 'Saisissez un NuméroH, un téléphone ou un e-mail' });
    const moiUser = await User.findByNumeroH(req.user.numeroH);
    const u = await trouverDestinataire(q, req.user.numeroH, moiUser);
    if (!u || u.isActive === false) {
      return res.status(404).json({ success: false, message: 'Aucun compte Moftal trouvé avec ce NuméroH, ce téléphone ou cet e-mail' });
    }
    if (u.numeroH === req.user.numeroH) {
      return res.status(400).json({ success: false, message: "C'est votre propre compte" });
    }
    res.json({ success: true, user: { numeroH: u.numeroH, prenom: u.prenom, nomFamille: u.nomFamille, photo: u.photo || null, genre: u.genre || null } });
  } catch (error) {
    console.error('Erreur /friends/trouver-personne:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// search-by-phone
router.get('/search-by-phone', async (req, res) => {
  try {
    const { tel } = req.query;
    if (!tel || tel.trim().length < 6) {
      return res.status(400).json({ success: false, message: 'Numéro requis (min. 6 chiffres)' });
    }
    if (tel.replace(/[^0-9]/g, '').length < 6) {
      return res.status(400).json({ success: false, message: 'Numéro requis (min. 6 chiffres)' });
    }
    const [trouve] = await numerosHParTelephones([tel], req.user.numeroH);
    if (!trouve) {
      const moi = await numerosHParTelephones([tel], '');
      if (moi.includes(req.user.numeroH)) {
        return res.status(400).json({ success: false, message: "C'est votre propre numéro" });
      }
      return res.status(404).json({ success: false, message: 'Aucun utilisateur trouvé avec ce numéro' });
    }
    const user = await User.findByNumeroH(trouve);
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
    const trouves = await numerosHParTelephones(phones, numeroH);
    if (trouves.length === 0) return res.json({ success: true, matches: [] });
    const users = await User.findAll({
      where: { numeroH: { [Op.in]: trouves } },
      attributes: ['numeroH', 'prenom', 'nomFamille', 'photo']
    });

    // Exclut ceux déjà amis ou avec une demande en attente (rien à "ajouter" pour eux) —
    // sauf si includeConnections est demandé (ex: choisir un conjoint/parent/enfant
    // dans l'Arbre, où être déjà ami ne doit pas empêcher de le sélectionner).
    const excluded = new Set();
    if (!req.body?.includeConnections) {
      const [existingFriends, pendingRequests] = await Promise.all([
        Friend.findAll({ where: { [Op.or]: [{ userNumeroH: numeroH }, { friendNumeroH: numeroH }] } }),
        FriendRequest.findAll({ where: { [Op.or]: [{ fromUser: numeroH }, { toUser: numeroH }], status: 'pending' } })
      ]);
      existingFriends.forEach(f => excluded.add(f.userNumeroH === numeroH ? f.friendNumeroH : f.userNumeroH));
      pendingRequests.forEach(r => excluded.add(r.fromUser === numeroH ? r.toUser : r.fromUser));
    }

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
    const user = await utilisateurParEmail(email);
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
    where[Op.and] = [...andClauses, sequelize.literal(sansComptesAdmin('"User".'))];
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
      where: { numeroH: { [Op.in]: memberNumeroHs }, [Op.and]: [sequelize.literal(sansComptesAdmin('"User".'))] },
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
      where: { activite1, numeroH: { [Op.ne]: numeroH }, [Op.and]: [sequelize.literal(sansComptesAdmin('"User".'))] },
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

// GET /api/friends/admin/all-links — liste des conversations Amitié existantes,
// réservée au chef unique (G7), pour la modération/sécurité des utilisateurs.
router.get('/admin/all-links', async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Accès réservé.' });
    }
    const links = await Friend.findAll({
      where: { status: 'accepted' },
      order: [['accepted_at', 'DESC']],
      limit: 500
    });
    const numeroHs = [...new Set(links.flatMap(l => [l.userNumeroH, l.friendNumeroH]))];
    const users = await User.findAll({
      where: { numeroH: { [Op.in]: numeroHs } },
      attributes: ['numeroH', 'prenom', 'nomFamille', 'photo']
    });
    const byNumeroH = Object.fromEntries(users.map(u => [u.numeroH, u]));
    res.json({
      success: true,
      links: links.map(l => ({
        id: l.id,
        userA: byNumeroH[l.userNumeroH] || { numeroH: l.userNumeroH },
        userB: byNumeroH[l.friendNumeroH] || { numeroH: l.friendNumeroH },
        acceptedAt: l.acceptedAt
      }))
    });
  } catch (error) {
    console.error('Erreur /friends/admin/all-links:', error);
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
    if (!estDansLAmitie(friend, req.user.numeroH)) {
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
    if (!estDansLAmitie(friend, user.numeroH)) {
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
    notifierNouveauMessage({ destinataires: [friend.userNumeroH, friend.friendNumeroH], expediteur: user, convKey: `friend:${linkId}`, message: msg });
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
    if (!estDansLAmitie(friend, user.numeroH)) {
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
    notifierNouveauMessage({ destinataires: [friend.userNumeroH, friend.friendNumeroH], expediteur: user, convKey: `friend:${linkId}`, message: msg });
    res.status(201).json({ success: true, message: msgData });
  } catch (error) {
    console.error('Erreur upload message ami:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

router.get('/:numeroH', async (req, res) => {
  try {
    // Seul l'intéressé (ou l'admin) peut lire sa liste d'amis
    const cible = String(req.params.numeroH || '').trim().toLowerCase();
    const moi = String(req.user?.numeroH || '').trim().toLowerCase();
    if (cible !== moi && !estAdminOuRole(req.user)) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }
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
    // Seuls les deux membres de l'amitié (ou l'admin) peuvent la supprimer
    if (!estDansLAmitie(friend, req.user?.numeroH) && !estAdminOuRole(req.user)) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }
    await friend.destroy();
    res.json({ success: true, message: 'Ami supprimé' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'ami:', error);
    res.status(500).json({ success: false, message: error.message || 'Erreur serveur' });
  }
});

export default router;
