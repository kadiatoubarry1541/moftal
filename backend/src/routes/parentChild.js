import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { authenticate } from '../middleware/auth.js';
import User from '../models/User.js';
import ParentChildLink from '../models/ParentChildLink.js';
import ParentChildActivity from '../models/ParentChildActivity.js';
import ParentChildRating from '../models/ParentChildRating.js';
import { sequelize } from '../config/database.js';
import Notification from '../models/Notification.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const childStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/enfants');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `enfant-${uniqueSuffix}${path.extname(file.originalname) || ''}`);
  }
});
const uploadChild = multer({ storage: childStorage, limits: { fileSize: 50 * 1024 * 1024 } });

const router = express.Router();
router.use(authenticate);

// Crée la table parent_child_activities si elle n'existe pas (dev ET production)
async function ensureParentChildActivityTable() {
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "parent_child_activities" (
        "id"               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        "parent_numero_h"  VARCHAR(255) NOT NULL,
        "child_numero_h"   VARCHAR(255) NOT NULL,
        "from_numero_h"    VARCHAR(255) NOT NULL,
        "to_numero_h"      VARCHAR(255) NOT NULL,
        "type"             VARCHAR(50)  DEFAULT 'message',
        "content"          TEXT,
        "media_url"        TEXT,
        "is_active"        BOOLEAN      DEFAULT true,
        "created_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "updated_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
    `);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_pca_pair ON "parent_child_activities" ("parent_numero_h", "child_numero_h");`).catch(() => {});
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_pca_from ON "parent_child_activities" ("from_numero_h");`).catch(() => {});
    await sequelize.query(`ALTER TABLE "parent_child_activities" ALTER COLUMN "media_url" TYPE TEXT;`).catch(() => {});
  } catch (err) {
    console.warn('⚠️ ensureParentChildActivityTable:', err.message);
  }
}

/** Admin : aucune condition, tout voir et tout gérer. */
const isAdmin = (user) =>
  !!(
    user &&
    (
      user.role === 'admin' ||
      user.role === 'super-admin' ||
      user.numeroH === 'G7C7P7R7E7F7 7' ||
      user.bypassRestrictions
    )
  );

/**
 * POST /api/parent-child/link
 * Le parent ajoute un enfant avec le numéro unique (code), NumeroH de l'enfant et numéro maternité.
 */
router.post('/link', async (req, res) => {
  try {
    const user = req.user;
    const { codeLiaison, childNumeroH, numeroMaternite, parentType } = req.body;

    if (!childNumeroH || !String(childNumeroH).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Le NumeroH de l\'apprenant est obligatoire'
      });
    }

    const typeParent = parentType && ['pere', 'mere'].includes(parentType) ? parentType : 'pere';

    const child = await User.findByNumeroH(childNumeroH);
    if (!child) {
      return res.status(404).json({
        success: false,
        message: 'Aucun utilisateur trouvé avec ce NumeroH pour l\'apprenant'
      });
    }

    const existing = await ParentChildLink.findOne({
      where: {
        parentNumeroH: user.numeroH,
        childNumeroH,
        parentType: typeParent,
        isActive: true
      }
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Ce lien parent-enfant existe déjà'
      });
    }

    const link = await ParentChildLink.create({
      parentNumeroH: user.numeroH,
      childNumeroH: String(childNumeroH).trim(),
      codeLiaison: codeLiaison ? String(codeLiaison).trim() : null,
      numeroMaternite: numeroMaternite ? String(numeroMaternite).trim() : null,
      parentType: typeParent,
      status: 'pending'
    });

    // Notifier l'enfant destinataire
    try {
      const senderName = [user.prenom, user.nomFamille].filter(Boolean).join(' ') || user.numeroH;
      await Notification.createNotification({
        recipientNumeroH: String(childNumeroH).trim(),
        type: 'parent_request',
        title: 'Demande de lien parent-enfant',
        message: `${senderName} vous a envoyé une demande de lien parent (${typeParent}).`,
        relatedId: link.id
      });
    } catch (e) { console.error('Notif parent_request:', e.message); }

    res.json({
      success: true,
      message: 'Demande envoyée. C\'est au destinataire (l\'apprenant) de confirmer le lien.',
      link: {
        id: link.id,
        parentNumeroH: link.parentNumeroH,
        childNumeroH: link.childNumeroH,
        codeLiaison: link.codeLiaison,
        numeroMaternite: link.numeroMaternite,
        parentType: link.parentType,
        status: link.status
      },
      child: {
        numeroH: child.numeroH,
        prenom: child.prenom,
        nomFamille: child.nomFamille,
        dateNaissance: child.dateNaissance,
        photo: child.photo
      }
    });
  } catch (error) {
    console.error('Erreur création lien parent-enfant:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création du lien'
    });
  }
});

/**
 * POST /api/parent-child/register-parents
 * L'apprenant (connecté) enregistre les NumeroH de ses parents pour qu'ils puissent le suivre.
 * Body: { parent1NumeroH, parent2NumeroH? }
 */
router.post('/register-parents', async (req, res) => {
  try {
    const user = req.user;
    const { parent1NumeroH, parent2NumeroH } = req.body;
    if (!parent1NumeroH || !String(parent1NumeroH).trim()) {
      return res.status(400).json({
        success: false,
        message: 'NumeroH du parent 1 est requis'
      });
    }
    const childNumeroH = user.numeroH;
    const parents = [parent1NumeroH.trim()];
    if (parent2NumeroH && String(parent2NumeroH).trim()) {
      parents.push(parent2NumeroH.trim());
    }
    const created = [];
    for (const parentNumeroH of parents) {
      if (parentNumeroH === childNumeroH) continue;
      const parentUser = await User.findByNumeroH(parentNumeroH);
      if (!parentUser) continue;
      const existing = await ParentChildLink.findOne({
        where: {
          parentNumeroH,
          childNumeroH,
          isActive: true
        }
      });
      if (existing) continue;
      const link = await ParentChildLink.create({
        parentNumeroH,
        childNumeroH,
        parentType: 'pere',
        status: 'active',
        confirmedAt: new Date()
      });
      created.push({ parentNumeroH, linkId: link.id });
    }
    res.json({
      success: true,
      message: created.length
        ? 'NumeroH des parents enregistrés. Ils pourront suivre votre progression.'
        : 'Aucun nouveau parent ajouté (déjà liés ou NumeroH invalides).',
      created: created.length
    });
  } catch (error) {
    console.error('Erreur register-parents:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'enregistrement des parents'
    });
  }
});

/**
 * GET /api/parent-child/pending-invitations
 * Invitations en attente pour l'enfant (le destinataire confirme).
 */
router.get('/pending-invitations', async (req, res) => {
  try {
    const user = req.user;
    const links = await ParentChildLink.getPendingInvitationsForChild(user.numeroH);
    const withParent = await Promise.all(
      links.map(async (link) => {
        const parent = await User.findOne({
          where: { numeroH: link.parentNumeroH },
          attributes: ['numeroH', 'prenom', 'nomFamille', 'photo', 'genre']
        });
        return { ...link.toJSON(), parent };
      })
    );
    res.json({ success: true, invitations: withParent });
  } catch (error) {
    console.error('Erreur invitations en attente:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * POST /api/parent-child/confirm/:linkId
 * L'enfant (destinataire) confirme le lien.
 */
router.post('/confirm/:linkId', async (req, res) => {
  try {
    const user = req.user;
    const { linkId } = req.params;
    const link = await ParentChildLink.findByPk(linkId);
    if (!link || !link.isActive) {
      return res.status(404).json({ success: false, message: 'Lien non trouvé' });
    }
    if (link.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Ce lien n\'est plus en attente' });
    }
    if (link.childNumeroH !== user.numeroH && !isAdmin(user)) {
      return res.status(403).json({ success: false, message: 'Seul l\'apprenant (destinataire) peut confirmer ce lien' });
    }
    link.status = 'active';
    link.confirmedAt = new Date();
    await link.save();
    res.json({ success: true, message: 'Lien confirmé. Vous êtes maintenant lié.' });
  } catch (error) {
    console.error('Erreur confirmation lien:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * POST /api/parent-child/reject/:linkId
 * L'enfant (destinataire) refuse le lien. Le parent verra le refus (message "Désolé").
 */
router.post('/reject/:linkId', async (req, res) => {
  try {
    const user = req.user;
    const { linkId } = req.params;
    const { message } = req.body || {};
    const link = await ParentChildLink.findByPk(linkId);
    if (!link || !link.isActive) {
      return res.status(404).json({ success: false, message: 'Lien non trouvé' });
    }
    if (link.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Ce lien n\'est plus en attente' });
    }
    if (link.childNumeroH !== user.numeroH && !isAdmin(user)) {
      return res.status(403).json({ success: false, message: 'Seul l\'apprenant (destinataire) peut refuser ce lien' });
    }
    link.status = 'rejected';
    await link.save();
    res.json({
      success: true,
      message: 'Lien refusé. Le parent sera notifié.',
      rejectedMessage: message || 'Désolé, je ne souhaite pas créer ce lien.'
    });
  } catch (error) {
    console.error('Erreur rejet lien parent-enfant:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/parent-child/link/:linkId
 * Quitter / supprimer le lien (parent ou enfant, chacun est libre à tout moment).
 */
router.delete('/link/:linkId', async (req, res) => {
  try {
    const user = req.user;
    const { linkId } = req.params;
    const link = await ParentChildLink.findByPk(linkId);
    if (!link) {
      return res.status(404).json({ success: false, message: 'Lien non trouvé' });
    }
    const isParent = link.parentNumeroH === user.numeroH;
    const isChild = link.childNumeroH === user.numeroH;
    if (!isParent && !isChild && !isAdmin(user)) {
      return res.status(403).json({ success: false, message: 'Vous ne faites pas partie de ce lien' });
    }
    link.isActive = false;
    await link.save();
    res.json({ success: true, message: 'Lien supprimé. Vous avez quitté cette liaison.' });
  } catch (error) {
    console.error('Erreur suppression lien:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * GET /api/parent-child/pending-sent
 * Demandes envoyées en attente de confirmation par l'enfant (pour le parent).
 */
router.get('/pending-sent', async (req, res) => {
  try {
    const user = req.user;
    const links = await ParentChildLink.getPendingSentByParent(user.numeroH);
    const withChild = await Promise.all(
      links.map(async (link) => {
        const child = await User.findOne({
          where: { numeroH: link.childNumeroH },
          attributes: ['numeroH', 'prenom', 'nomFamille', 'photo', 'genre']
        });
        return { ...link.toJSON(), child };
      })
    );
    res.json({ success: true, invitations: withChild });
  } catch (error) {
    console.error('Erreur demandes envoyées:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * GET /api/parent-child/my-children
 * Liste des enfants liés (pour le parent).
 */
router.get('/my-children', async (req, res) => {
  try {
    const user = req.user;
    const links = isAdmin(user)
      ? await ParentChildLink.findAll({ where: { status: 'active', isActive: true }, order: [['created_at', 'DESC']] })
      : await ParentChildLink.getMyChildren(user.numeroH);

    const childrenWithDetails = await Promise.all(
      links.map(async (link) => {
        const child = await User.findOne({
          where: { numeroH: link.childNumeroH },
          attributes: ['numeroH', 'prenom', 'nomFamille', 'dateNaissance', 'photo', 'genre']
        });
        const activities = await ParentChildActivity.getActivitiesForPair(link.parentNumeroH, link.childNumeroH);
        return {
          ...link.toJSON(),
          child,
          activitiesCount: activities.length
        };
      })
    );

    res.json({
      success: true,
      children: childrenWithDetails,
      ...(isAdmin(user) && { adminView: true })
    });
  } catch (error) {
    console.error('Erreur récupération mes enfants:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

/**
 * GET /api/parent-child/my-parents
 * Liste des parents liés (pour l'enfant).
 */
router.get('/my-parents', async (req, res) => {
  try {
    const user = req.user;
    const links = isAdmin(user)
      ? await ParentChildLink.findAll({ where: { status: 'active', isActive: true }, order: [['created_at', 'DESC']] })
      : await ParentChildLink.getMyParents(user.numeroH);

    const parentsWithDetails = await Promise.all(
      links.map(async (link) => {
        const parent = await User.findOne({
          where: { numeroH: link.parentNumeroH },
          attributes: ['numeroH', 'prenom', 'nomFamille', 'photo', 'genre']
        });
        const activities = await ParentChildActivity.getActivitiesForPair(link.parentNumeroH, user.numeroH);
        return {
          ...link.toJSON(),
          parent,
          activitiesCount: activities.length
        };
      })
    );

    res.json({
      success: true,
      parents: parentsWithDetails,
      ...(isAdmin(user) && { adminView: true })
    });
  } catch (error) {
    console.error('Erreur récupération mes parents:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

/**
 * GET /api/parent-child/activities
 * Activités pour une paire parent-enfant (query: parentNumeroH, childNumeroH)
 * ou toutes les activités pour l'utilisateur (pas de query = selon son rôle).
 */
router.get('/activities', async (req, res) => {
  try {
    const user = req.user;
    const { parentNumeroH, childNumeroH } = req.query;

    if (parentNumeroH && childNumeroH) {
      const link = await ParentChildLink.findOne({
        where: {
          parentNumeroH,
          childNumeroH,
          status: 'active',
          isActive: true
        }
      });
      if (!link) {
        return res.status(403).json({
          success: false,
          message: 'Vous n\'êtes pas autorisé à voir ces activités'
        });
      }
      const isParent = user.numeroH === parentNumeroH;
      const isChild = user.numeroH === childNumeroH;
      if (!isParent && !isChild) {
        return res.status(403).json({
          success: false,
          message: 'Accès non autorisé'
        });
      }
      const activities = await ParentChildActivity.getActivitiesForPair(parentNumeroH, childNumeroH);
      const fromUsers = await User.findAll({
        where: { numeroH: [...new Set(activities.map(a => a.fromNumeroH))] },
        attributes: ['numeroH', 'prenom', 'nomFamille']
      });
      const fromMap = Object.fromEntries(fromUsers.map(u => [u.numeroH, u]));
      const list = activities.map(a => ({
        ...a.toJSON(),
        fromName: fromMap[a.fromNumeroH] ? `${fromMap[a.fromNumeroH].prenom} ${fromMap[a.fromNumeroH].nomFamille}` : a.fromNumeroH
      }));
      return res.json({ success: true, activities: list });
    }

    let activitiesList;
    if (isAdmin(user)) {
      const all = await ParentChildActivity.findAll({
        where: { isActive: true },
        order: [['created_at', 'DESC']],
        limit: 500
      });
      const allIds = [...new Set(all.map(a => a.fromNumeroH))];
      const users = await User.findAll({ where: { numeroH: allIds }, attributes: ['numeroH', 'prenom', 'nomFamille'] });
      const userMap = Object.fromEntries(users.map(u => [u.numeroH, u]));
      activitiesList = all.map(a => ({
        ...a.toJSON(),
        fromName: userMap[a.fromNumeroH] ? `${userMap[a.fromNumeroH].prenom} ${userMap[a.fromNumeroH].nomFamille}` : a.fromNumeroH
      }));
    } else {
      const asParent = await ParentChildActivity.getActivitiesForParent(user.numeroH);
      const asChild = await ParentChildActivity.getActivitiesForChild(user.numeroH);
      const allIds = [...new Set([...asParent.map(a => a.fromNumeroH), ...asParent.map(a => a.toNumeroH), ...asChild.map(a => a.fromNumeroH), ...asChild.map(a => a.toNumeroH)])];
      const users = await User.findAll({
        where: { numeroH: allIds },
        attributes: ['numeroH', 'prenom', 'nomFamille']
      });
      const userMap = Object.fromEntries(users.map(u => [u.numeroH, u]));
      const combine = (list) => list.map(a => ({
        ...a.toJSON(),
        fromName: userMap[a.fromNumeroH] ? `${userMap[a.fromNumeroH].prenom} ${userMap[a.fromNumeroH].nomFamille}` : a.fromNumeroH
      }));
      activitiesList = [...combine(asParent), ...combine(asChild)].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      ).slice(0, 100);
    }

    res.json({ success: true, activities: activitiesList, ...(isAdmin(user) && { adminView: true }) });
  } catch (error) {
    console.error('Erreur récupération activités:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

/**
 * POST /api/parent-child/activity
 * Ajouter une activité (ce que je fais pour mon parent ou mon enfant).
 */
router.post('/activity', async (req, res) => {
  try {
    await ensureParentChildActivityTable();
    const user = req.user;
    const { parentNumeroH, childNumeroH, toNumeroH, type, content, mediaUrl } = req.body;

    if (!parentNumeroH || !childNumeroH || !toNumeroH) {
      return res.status(400).json({
        success: false,
        message: 'parentNumeroH, childNumeroH et toNumeroH sont requis'
      });
    }

    const link = await ParentChildLink.findOne({
      where: {
        parentNumeroH,
        childNumeroH,
        status: 'active',
        isActive: true
      }
    });
    if (!link) {
      return res.status(403).json({
        success: false,
        message: 'Lien parent-enfant non trouvé ou inactif'
      });
    }

    const isParent = user.numeroH === parentNumeroH;
    const isChild = user.numeroH === childNumeroH;
    if (!isParent && !isChild && !isAdmin(user)) {
      return res.status(403).json({
        success: false,
        message: 'Vous ne faites pas partie de cette liaison'
      });
    }

    if (toNumeroH !== parentNumeroH && toNumeroH !== childNumeroH) {
      return res.status(400).json({
        success: false,
        message: 'toNumeroH doit être le parent ou l\'enfant de cette liaison'
      });
    }

    const activity = await ParentChildActivity.create({
      parentNumeroH,
      childNumeroH,
      fromNumeroH: user.numeroH,
      toNumeroH,
      type: type || 'message',
      content: content || null,
      mediaUrl: mediaUrl || null
    });

    res.json({
      success: true,
      message: 'Activité enregistrée',
      activity: {
        ...activity.toJSON(),
        fromName: `${user.prenom} ${user.nomFamille}`
      }
    });
  } catch (error) {
    console.error('Erreur ajout activité:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

/**
 * GET /api/parent-child/ratings/for-child
 * Notes que les parents ont données à l'enfant (enfant = utilisateur connecté).
 * L'enfant ne voit que le tableau, pas le bouton ajouter.
 */
router.get('/ratings/for-child', async (req, res) => {
  try {
    const user = req.user;
    const list = await ParentChildRating.getForChild(user.numeroH);
    const parentIds = [...new Set(list.map((r) => r.parentNumeroH))];
    const parents = await User.findAll({
      where: { numeroH: parentIds },
      attributes: ['numeroH', 'prenom', 'nomFamille']
    });
    const parentMap = Object.fromEntries(parents.map((p) => [p.numeroH, p]));
    const ratings = list.map((r) => ({
      ...r.toJSON(),
      parentName: parentMap[r.parentNumeroH]
        ? `${parentMap[r.parentNumeroH].prenom} ${parentMap[r.parentNumeroH].nomFamille}`
        : r.parentNumeroH
    }));
    res.json({ success: true, ratings });
  } catch (error) {
    console.error('Erreur récupération notes pour enfant:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * GET /api/parent-child/ratings?parentNumeroH=...&childNumeroH=...
 * Notes qu'un parent a données à un enfant (pour la paire). Réservé au parent ou à l'enfant.
 */
router.get('/ratings', async (req, res) => {
  try {
    const user = req.user;
    const { parentNumeroH, childNumeroH } = req.query;
    if (!parentNumeroH || !childNumeroH) {
      return res.status(400).json({ success: false, message: 'parentNumeroH et childNumeroH requis' });
    }
    const link = await ParentChildLink.findOne({
      where: {
        parentNumeroH,
        childNumeroH,
        status: 'active',
        isActive: true
      }
    });
    if (!link) {
      return res.status(403).json({ success: false, message: 'Lien parent-enfant non trouvé ou inactif' });
    }
    const isParent = user.numeroH === parentNumeroH;
    const isChild = user.numeroH === childNumeroH;
    if (!isParent && !isChild && !isAdmin(user)) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé' });
    }
    const list = await ParentChildRating.getForPair(parentNumeroH, childNumeroH);
    res.json({ success: true, ratings: list.map((r) => r.toJSON()) });
  } catch (error) {
    console.error('Erreur récupération notes paire:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * POST /api/parent-child/ratings
 * Ajouter une note (parent → enfant). Body: { childNumeroH, annee, note }.
 * Seul le parent de cet enfant peut appeler.
 */
router.post('/ratings', async (req, res) => {
  try {
    const user = req.user;
    const { childNumeroH, annee, note } = req.body;
    if (!childNumeroH || annee == null || note == null) {
      return res.status(400).json({
        success: false,
        message: 'childNumeroH, annee et note sont requis'
      });
    }
    const numNote = Math.min(5, Math.max(1, parseInt(note, 10)));
    const numAnnee = parseInt(annee, 10) || new Date().getFullYear();
    const link = await ParentChildLink.findOne({
      where: {
        parentNumeroH: user.numeroH,
        childNumeroH: String(childNumeroH).trim(),
        status: 'active',
        isActive: true
      }
    });
    if (!link) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas le parent de cet enfant ou le lien n\'est pas actif'
      });
    }
    const rating = await ParentChildRating.create({
      parentNumeroH: user.numeroH,
      childNumeroH: String(childNumeroH).trim(),
      annee: numAnnee,
      note: numNote
    });
    res.json({ success: true, rating: rating.toJSON() });
  } catch (error) {
    console.error('Erreur ajout note parent-enfant:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/parent-child/link-by-users
 * Admin : supprimer un lien parent-enfant par parentNumeroH et childNumeroH (body).
 */
router.delete('/link-by-users', async (req, res) => {
  try {
    const user = req.user;
    if (!isAdmin(user)) {
      return res.status(403).json({ success: false, message: 'Accès réservé aux administrateurs' });
    }
    const { parentNumeroH, childNumeroH } = req.body;
    if (!parentNumeroH || !childNumeroH) {
      return res.status(400).json({ success: false, message: 'parentNumeroH et childNumeroH sont requis' });
    }
    const link = await ParentChildLink.findOne({
      where: { parentNumeroH, childNumeroH, isActive: true }
    });
    if (!link) {
      return res.status(404).json({ success: false, message: 'Lien familial non trouvé' });
    }
    link.isActive = false;
    await link.save();
    res.json({ success: true, message: 'Lien familial supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression lien-by-users:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * GET /api/parent-child/admin/all-links
 * Admin uniquement : toutes les liaisons parent-enfant (actives + en attente).
 */
router.get('/admin/all-links', async (req, res) => {
  try {
    const user = req.user;
    if (!isAdmin(user)) {
      return res.status(403).json({ success: false, message: 'Accès réservé aux administrateurs' });
    }
    const links = await ParentChildLink.findAll({
      where: { isActive: true },
      order: [['created_at', 'DESC']]
    });
    const withUsers = await Promise.all(
      links.map(async (link) => {
        const [parent, child] = await Promise.all([
          User.findOne({ where: { numeroH: link.parentNumeroH }, attributes: ['numeroH', 'prenom', 'nomFamille', 'photo'] }),
          User.findOne({ where: { numeroH: link.childNumeroH }, attributes: ['numeroH', 'prenom', 'nomFamille', 'photo'] })
        ]);
        return {
          ...link.toJSON(),
          parent: parent ? parent.toJSON() : null,
          child: child ? child.toJSON() : null
        };
      })
    );
    res.json({ success: true, links: withUsers });
  } catch (error) {
    console.error('Erreur admin all-links parent-child:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * POST /api/parent-child/activity/upload
 * Enregistre une activité parent-enfant avec fichier média via multer.
 */
router.post('/activity/upload', uploadChild.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 },
  { name: 'audio', maxCount: 1 }
]), async (req, res) => {
  try {
    await ensureParentChildActivityTable();
    const user = req.user;
    const { parentNumeroH, childNumeroH, toNumeroH, type, content } = req.body;

    if (!parentNumeroH || !childNumeroH || !toNumeroH) {
      return res.status(400).json({
        success: false,
        message: 'parentNumeroH, childNumeroH et toNumeroH sont requis'
      });
    }

    const link = await ParentChildLink.findOne({
      where: { parentNumeroH, childNumeroH, status: 'active', isActive: true }
    });
    if (!link) {
      return res.status(403).json({ success: false, message: 'Lien parent-enfant non trouvé ou inactif' });
    }

    const isParent = user.numeroH === parentNumeroH;
    const isChild = user.numeroH === childNumeroH;
    if (!isParent && !isChild && !isAdmin(user)) {
      return res.status(403).json({ success: false, message: 'Vous ne faites pas partie de cette liaison' });
    }

    let mediaUrl = null;
    const files = req.files || {};
    const uploadedFile = (files.image && files.image[0]) || (files.video && files.video[0]) || (files.audio && files.audio[0]);
    if (uploadedFile) {
      mediaUrl = `/uploads/enfants/${uploadedFile.filename}`;
    }

    const activity = await ParentChildActivity.create({
      parentNumeroH,
      childNumeroH,
      fromNumeroH: user.numeroH,
      toNumeroH,
      type: type || 'media',
      content: content || null,
      mediaUrl
    });

    res.json({
      success: true,
      message: 'Activité enregistrée',
      activity: {
        ...activity.toJSON(),
        fromName: `${user.prenom} ${user.nomFamille}`
      }
    });
  } catch (error) {
    console.error('Erreur upload activité parent-enfant:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

export default router;
