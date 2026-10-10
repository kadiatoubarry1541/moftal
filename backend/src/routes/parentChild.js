import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import User from '../models/User.js';
import ParentChildLink from '../models/ParentChildLink.js';
import ParentChildActivity from '../models/ParentChildActivity.js';
import ParentChildRating from '../models/ParentChildRating.js';
import ParentChildMessage from '../models/ParentChildMessage.js';
import { sequelize } from '../config/database.js';
import Notification from '../models/Notification.js';
import { uploadToImageKit } from '../services/imagekitStorage.js';
import { uploadToR2 } from '../services/r2Storage.js';
import { uploadToIDrive } from '../services/idriveStorage.js';
import { getIO } from '../socket.js';
import { addUserToFamilyTree, MAX_MEMBRES_ARBRE } from './familyTree.js';
import { notifierNouveauMessage } from '../services/notificationMessages.js';
import { Op } from 'sequelize';
import CoupleLink from '../models/CoupleLink.js';
import EnfantSansCompte from '../models/EnfantSansCompte.js';
import {
  ensureTableFiches, nouveauNumeroFiche, cleExtrait, normaliserPrenom, memeDate, estFiche,
  fichesParNumero, ficheCommeMembre, estDeLaFamille, estParentDeLaFiche, lierParent, typeParent,
  fusionnerFiche, annulerFusion, comptesCorrespondants, parentsDeLaFiche
} from '../services/enfantsSansCompte.js';

// Upload en mémoire — jamais sur le disque du serveur (effacé à chaque
// redémarrage/redéploiement) — puis envoyé vers le stockage cloud.
const uploadChild = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const router = express.Router();
router.use(authenticate);

// Table des enfants sans compte : créée dès le démarrage (et sinon au premier usage)
setTimeout(() => { ensureTableFiches().catch((e) => console.warn('⚠️ enfants_sans_compte:', e.message)); }, 5000);

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

// Crée la table parent_child_messages si elle n'existe pas (dev ET production)
async function ensureParentChildMessagesTable() {
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "parent_child_messages" (
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
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_pcm_link ON "parent_child_messages" ("link_id");`).catch(() => {});
  } catch (err) {
    console.warn('⚠️ ensureParentChildMessagesTable:', err.message);
  }
}

/**
 * Statut d'un lien demandé par l'enfant (/register-parents) : en attente de
 * confirmation par le parent (le statut 'pending' attend, lui, l'enfant).
 */
const STATUT_ATTENTE_PARENT = 'pending_parent';

/** Vérifie que l'utilisateur fait bien partie de ce lien parent-enfant. */
function estDansLeLienPC(link, numeroH) {
  return !!link && (link.parentNumeroH === numeroH || link.childNumeroH === numeroH);
}

/** Envoi de messages : seulement sur un lien confirmé et toujours actif. */
function lienPCActif(link) {
  return !!link && link.status === 'active' && link.isActive !== false;
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
        childNumeroH: child.numeroH,
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

    // Maximum 15 enfants par parent (actifs + en attente de confirmation)
    const { Op: OpChild } = await import('sequelize');
    const childrenCount = await ParentChildLink.count({
      where: { parentNumeroH: user.numeroH, parentType: typeParent, status: { [OpChild.in]: ['active', 'pending'] }, isActive: true }
    });
    if (childrenCount >= 15) {
      return res.status(400).json({
        success: false,
        message: 'Vous avez déjà 15 enfants liés (ou en attente de confirmation) — c\'est le maximum autorisé.'
      });
    }

    const link = await ParentChildLink.create({
      parentNumeroH: user.numeroH,
      childNumeroH: child.numeroH,
      codeLiaison: codeLiaison ? String(codeLiaison).trim() : null,
      numeroMaternite: numeroMaternite ? String(numeroMaternite).trim() : null,
      parentType: typeParent,
      status: 'pending'
    });

    // Notifier l'enfant destinataire
    try {
      const senderName = [user.prenom, user.nomFamille].filter(Boolean).join(' ') || user.numeroH;
      await Notification.createNotification({
        recipientNumeroH: child.numeroH,
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
    for (const saisie of parents) {
      const parentUser = await User.findByNumeroH(saisie);
      if (!parentUser) continue;
      // On enregistre le vrai NumeroH du compte trouvé, jamais la saisie brute
      const parentNumeroH = parentUser.numeroH;
      if (parentNumeroH === childNumeroH) continue;
      const existing = await ParentChildLink.findOne({
        where: {
          parentNumeroH,
          childNumeroH,
          isActive: true
        }
      });
      if (existing) continue;
      // Lien en attente : le parent doit confirmer (jamais de rattachement
      // automatique d'un enfant à n'importe qui sans son accord).
      const link = await ParentChildLink.create({
        parentNumeroH,
        childNumeroH,
        parentType: 'pere',
        status: STATUT_ATTENTE_PARENT
      });
      try {
        const senderName = [user.prenom, user.nomFamille].filter(Boolean).join(' ') || user.numeroH;
        await Notification.createNotification({
          recipientNumeroH: parentNumeroH,
          type: 'parent_request',
          title: 'Demande de lien parent-enfant',
          message: `${senderName} vous indique comme parent. Confirmez ou refusez ce lien.`,
          relatedId: link.id
        });
      } catch (e) { console.error('Notif parent_request (register-parents):', e.message); }
      created.push({ parentNumeroH, linkId: link.id });
    }
    res.json({
      success: true,
      message: created.length
        ? 'Demande envoyée à vos parents. Le lien sera actif dès qu\'ils l\'auront confirmé.'
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
    // Demandes envoyées par un enfant, que ce parent doit confirmer
    const demandesEnfants = await ParentChildLink.findAll({
      where: { parentNumeroH: user.numeroH, status: STATUT_ATTENTE_PARENT, isActive: true },
      order: [['created_at', 'DESC']]
    });
    const withChild = await Promise.all(
      demandesEnfants.map(async (link) => {
        const child = await User.findOne({
          where: { numeroH: link.childNumeroH },
          attributes: ['numeroH', 'prenom', 'nomFamille', 'photo', 'genre']
        });
        // `parent` = la personne qui demande (affichage), `child` pour plus de clarté
        return { ...link.toJSON(), demandeDeLEnfant: true, child, parent: child };
      })
    );
    res.json({ success: true, invitations: [...withParent, ...withChild] });
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
    if (link.status !== 'pending' && link.status !== STATUT_ATTENTE_PARENT) {
      return res.status(400).json({ success: false, message: 'Ce lien n\'est plus en attente' });
    }
    // Le destinataire confirme : l'enfant pour une demande du parent,
    // le parent pour une demande de l'enfant (/register-parents).
    const destinataire = link.status === STATUT_ATTENTE_PARENT ? link.parentNumeroH : link.childNumeroH;
    if (destinataire !== user.numeroH && !isAdmin(user)) {
      return res.status(403).json({ success: false, message: 'Seul le destinataire de la demande peut confirmer ce lien' });
    }

    // Rattache l'enfant au même arbre familial que son parent (limite de
    // MAX_MEMBRES_ARBRE membres) — si l'arbre est déjà plein, la confirmation
    // est bloquée : le parent devra libérer une place avant de réessayer.
    const child = await User.findOne({ where: { numeroH: link.childNumeroH } });
    const { limitReached } = await addUserToFamilyTree(
      link.childNumeroH,
      child?.numeroHPere || link.parentNumeroH,
      child?.numeroHMere || null
    );
    if (limitReached) {
      return res.status(400).json({
        success: false,
        message: `Cet arbre familial a déjà atteint la limite de ${MAX_MEMBRES_ARBRE} membres. Impossible de confirmer ce lien pour le moment.`
      });
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
    if (link.status !== 'pending' && link.status !== STATUT_ATTENTE_PARENT) {
      return res.status(400).json({ success: false, message: 'Ce lien n\'est plus en attente' });
    }
    const destinataire = link.status === STATUT_ATTENTE_PARENT ? link.parentNumeroH : link.childNumeroH;
    if (destinataire !== user.numeroH && !isAdmin(user)) {
      return res.status(403).json({ success: false, message: 'Seul le destinataire de la demande peut refuser ce lien' });
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

    // Enfants sans compte (fiches ENF-…) : même forme qu'un compte, papiers visibles des parents
    const fiches = await fichesParNumero(links.map((l) => l.childNumeroH)).catch(() => new Map());
    // Fiches déjà fusionnées avec un compte : le parent peut annuler une fusion faite par erreur
    const comptes = links.map((l) => l.childNumeroH).filter((n) => !estFiche(n));
    const fusionnees = comptes.length
      ? await EnfantSansCompte.findAll({ where: { fusionneAvec: { [Op.in]: comptes }, isActive: true } }).catch(() => [])
      : [];
    const childrenWithDetailsTous = await Promise.all(
      links.map(async (link) => {
        if (estFiche(link.childNumeroH)) {
          const fiche = fiches.get(link.childNumeroH);
          if (!fiche) return null;
          return { ...link.toJSON(), child: ficheCommeMembre(fiche, { avecPapiers: true }), sansCompte: true, activitiesCount: 0 };
        }
        const child = await User.findOne({
          where: { numeroH: link.childNumeroH },
          attributes: ['numeroH', 'prenom', 'nomFamille', 'dateNaissance', 'photo', 'genre']
        });
        const activities = await ParentChildActivity.getActivitiesForPair(link.parentNumeroH, link.childNumeroH);
        const ficheFusionnee = fusionnees.find((f) => f.fusionneAvec === link.childNumeroH);
        return {
          ...link.toJSON(),
          child,
          activitiesCount: activities.length,
          ...(ficheFusionnee ? { ficheFusionneeId: ficheFusionnee.id } : {})
        };
      })
    );
    const childrenWithDetails = childrenWithDetailsTous.filter(Boolean);

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
 * GET /api/parent-child/children-of/:numeroH
 * Liste des enfants CONFIRMÉS (liens actifs) d'un NumeroH donné — infos
 * publiques uniquement (identité + photo), pour afficher les petits-enfants
 * dans l'arbre d'un grand-parent sans exposer de données privées.
 */
router.get('/children-of/:numeroH', async (req, res) => {
  try {
    const { numeroH } = req.params;
    const links = await ParentChildLink.findAll({
      where: { parentNumeroH: numeroH, status: 'active', isActive: true },
      order: [['created_at', 'DESC']]
    });
    // Enfants sans compte : les enfants VIVANTS ne sont montrés qu'à la famille (protection des mineurs)
    const fiches = await fichesParNumero(links.map((l) => l.childNumeroH)).catch(() => new Map());
    const famille = fiches.size ? await estDeLaFamille(req.user.numeroH, numeroH) : false;
    const children = await Promise.all(
      links.map(async (link) => {
        if (estFiche(link.childNumeroH)) {
          const fiche = fiches.get(link.childNumeroH);
          if (!fiche || (fiche.estVivant && !famille)) return null;
          return { ...ficheCommeMembre(fiche), linkId: link.id, parentNumeroH: numeroH };
        }
        const child = await User.findOne({
          where: { numeroH: link.childNumeroH },
          attributes: ['numeroH', 'prenom', 'nomFamille', 'genre', 'dateNaissance', 'photo']
        });
        return child ? { ...child.toJSON(), linkId: link.id, parentNumeroH: numeroH } : null;
      })
    );
    res.json({ success: true, children: children.filter(Boolean) });
  } catch (error) {
    console.error('Erreur children-of:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * GET /api/parent-child/parents-of/:numeroH
 * Liste des parents CONFIRMÉS (liens actifs) d'un NumeroH donné — infos
 * publiques uniquement, pour dériver les grands-parents / oncles-tantes
 * dans l'arbre sans exposer de données privées.
 */
router.get('/parents-of/:numeroH', async (req, res) => {
  try {
    const { numeroH } = req.params;
    const links = await ParentChildLink.findAll({
      where: { childNumeroH: numeroH, status: 'active', isActive: true },
      order: [['created_at', 'DESC']]
    });
    const parents = await Promise.all(
      links.map(async (link) => {
        const parent = await User.findOne({
          where: { numeroH: link.parentNumeroH },
          attributes: ['numeroH', 'prenom', 'nomFamille', 'genre', 'dateNaissance', 'photo']
        });
        return parent ? { ...parent.toJSON(), linkId: link.id, parentType: link.parentType, childNumeroH: numeroH } : null;
      })
    );
    res.json({ success: true, parents: parents.filter(Boolean) });
  } catch (error) {
    console.error('Erreur parents-of:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
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

// ─── MESSAGERIE PRIVÉE PARENT-ENFANT (par lien précis) ───

/**
 * GET /api/parent-child/messages?linkId=
 */
router.get('/messages', async (req, res) => {
  try {
    await ensureParentChildMessagesTable();
    const { linkId } = req.query;
    if (!linkId) return res.status(400).json({ success: false, message: 'linkId requis.' });
    const link = await ParentChildLink.findByPk(linkId);
    if (!estDansLeLienPC(link, req.user.numeroH) && !isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }
    const messages = await ParentChildMessage.getMessages(linkId);
    const numeroHs = [...new Set(messages.map(m => m.numeroH))];
    const users = await User.findAll({ where: { numeroH: numeroHs }, attributes: ['numeroH', 'prenom', 'nomFamille'] });
    const userMap = Object.fromEntries(users.map(u => [u.numeroH, u]));
    const list = messages.slice().reverse().map(m => ({
      ...m.toJSON(),
      authorName: userMap[m.numeroH] ? `${userMap[m.numeroH].prenom} ${userMap[m.numeroH].nomFamille}` : m.numeroH
    }));
    res.json({ success: true, messages: list });
  } catch (error) {
    console.error('Erreur récupération messages parent-enfant:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * POST /api/parent-child/messages — message texte
 */
router.post('/messages', async (req, res) => {
  try {
    await ensureParentChildMessagesTable();
    const user = req.user;
    const { linkId, content, category = 'information' } = req.body;
    if (!linkId || !content?.trim()) {
      return res.status(400).json({ success: false, message: 'linkId et content requis.' });
    }
    const link = await ParentChildLink.findByPk(linkId);
    if (!estDansLeLienPC(link, user.numeroH)) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }
    if (!lienPCActif(link)) {
      return res.status(403).json({ success: false, message: 'Ce lien n\'est pas (ou plus) actif.' });
    }
    const msg = await ParentChildMessage.create({
      linkId,
      numeroH: user.numeroH,
      messageType: 'text',
      category,
      content: content.trim()
    });
    const msgData = { ...msg.toJSON(), authorName: `${user.prenom} ${user.nomFamille}` };
    const io = getIO();
    if (io) io.to(`parent-child-${linkId}`).emit('parent-child-message', msgData);
    notifierNouveauMessage({ destinataires: [link.parentNumeroH, link.childNumeroH], expediteur: user, convKey: `pc:${linkId}`, message: msg });
    res.status(201).json({ success: true, message: msgData });
  } catch (error) {
    console.error('Erreur envoi message parent-enfant:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * POST /api/parent-child/messages/upload — photo/vidéo/audio (≤30s côté client)
 */
router.post('/messages/upload', uploadChild.single('media'), async (req, res) => {
  try {
    await ensureParentChildMessagesTable();
    const user = req.user;
    const { linkId, category = 'information' } = req.body;
    if (!linkId) return res.status(400).json({ success: false, message: 'linkId requis.' });
    const link = await ParentChildLink.findByPk(linkId);
    if (!estDansLeLienPC(link, user.numeroH)) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }
    if (!lienPCActif(link)) {
      return res.status(403).json({ success: false, message: 'Ce lien n\'est pas (ou plus) actif.' });
    }
    if (!req.file) return res.status(400).json({ success: false, message: 'Aucun fichier reçu.' });

    const mime = req.file.mimetype;
    let messageType = 'image';
    if (mime.startsWith('video/')) messageType = 'video';
    else if (mime.startsWith('audio/')) messageType = 'audio';

    const mediaUrl = messageType === 'image'
      ? await uploadToImageKit(req.file.buffer, req.file.originalname, 'parent-child-messages')
      : await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype, 'parent-child-messages');
    uploadToIDrive(req.file.buffer, req.file.originalname, req.file.mimetype, 'parent-child-messages').catch(() => {});

    const content = req.body.content || (messageType === 'audio' ? '🎤 Message vocal' : messageType === 'video' ? '🎬 Vidéo' : '📷 Photo');

    const msg = await ParentChildMessage.create({
      linkId,
      numeroH: user.numeroH,
      messageType,
      category,
      content,
      mediaUrl
    });
    const msgData = { ...msg.toJSON(), authorName: `${user.prenom} ${user.nomFamille}` };
    const io = getIO();
    if (io) io.to(`parent-child-${linkId}`).emit('parent-child-message', msgData);
    notifierNouveauMessage({ destinataires: [link.parentNumeroH, link.childNumeroH], expediteur: user, convKey: `pc:${linkId}`, message: msg });
    res.status(201).json({ success: true, message: msgData });
  } catch (error) {
    console.error('Erreur upload message parent-enfant:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});


// ═══════════════ ENFANTS SANS COMPTE (bébé, mineur, enfant décédé jeune) ═══════════════
// Un parent ajoute son enfant sans que l'enfant ait de compte. L'enfant apparaît
// chez les deux parents (arbre, Mes enfants, Noyau). Plus tard, l'enfant devenu
// grand rejoint sa fiche avec son extrait de naissance (numéro + commune + année
// + date de naissance), ou un parent confirme la correspondance proposée.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_ENFANTS = 15;

// Photo : envoyée au stockage d'images ; si le stockage échoue, la photo
// compressée reste en base (jamais perdue).
async function enregistrerPhoto(photo) {
  if (!photo || typeof photo !== 'string') return null;
  if (!photo.startsWith('data:image/')) return photo.startsWith('http') ? photo : null;
  if (photo.length > 3_000_000) throw Object.assign(new Error('Photo trop lourde'), { status: 400 });
  try {
    const m = photo.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
    if (m) {
      const ext = m[1].split('/')[1].replace('jpeg', 'jpg');
      const url = await uploadToImageKit(Buffer.from(m[2], 'base64'), `enfant.${ext}`, 'enfants');
      if (url) return url;
    }
  } catch (e) { console.warn('photo enfant → stockage:', e.message); }
  return photo;
}

// Conjoint(e) actif(ve) de l'utilisateur, s'il/si elle est ce numéro
async function conjointActif(user, numeroH) {
  if (!numeroH) return null;
  const lien = await CoupleLink.findOne({
    where: {
      [Op.or]: [
        { husbandNumeroH: user.numeroH, wifeNumeroH: numeroH },
        { husbandNumeroH: numeroH, wifeNumeroH: user.numeroH }
      ],
      status: 'active', isActive: true
    }
  });
  return lien ? User.findByNumeroH(numeroH) : null;
}

function lireChampsEnfant(body, { creation }) {
  const prenom = String(body.prenom || '').trim();
  const genre = String(body.genre || '').toUpperCase();
  const estVivant = body.estVivant === undefined ? undefined : body.estVivant === true || body.estVivant === 'true';
  const dateNaissance = body.dateNaissance ? String(body.dateNaissance).slice(0, 10) : null;
  const dateDeces = body.dateDeces ? String(body.dateDeces).slice(0, 10) : null;
  const papiers = [body.extraitNumero, body.extraitCommune, body.extraitAnnee].map((v) => String(v || '').trim());
  const erreurs = [];
  if (creation || body.prenom !== undefined) { if (!prenom) erreurs.push('Le prénom est obligatoire.'); }
  if (creation || body.genre !== undefined) { if (!['HOMME', 'FEMME'].includes(genre)) erreurs.push('Choisissez garçon ou fille.'); }
  if (creation && estVivant === undefined) erreurs.push('Indiquez si l\'enfant est vivant ou décédé.');
  if (dateNaissance && !DATE_RE.test(dateNaissance)) erreurs.push('Date de naissance invalide.');
  if (dateDeces && !DATE_RE.test(dateDeces)) erreurs.push('Date de décès invalide.');
  const nbPapiers = papiers.filter(Boolean).length;
  let cle = null;
  if (nbPapiers > 0) {
    cle = cleExtrait({ numero: papiers[0], commune: papiers[1], annee: papiers[2] });
    if (nbPapiers < 3 || !cle) erreurs.push('Pour l\'extrait de naissance, remplissez les trois : numéro, commune et année (4 chiffres).');
  }
  return { prenom, genre, estVivant, dateNaissance, dateDeces, papiers, nbPapiers, cle, erreurs };
}

// POST /api/parent-child/enfants-sans-compte — ajouter un enfant sans compte
router.post('/enfants-sans-compte', async (req, res) => {
  try {
    await ensureTableFiches();
    const user = req.user;
    const c = lireChampsEnfant(req.body, { creation: true });
    if (c.cle && !c.dateNaissance) c.erreurs.push('Avec l\'extrait de naissance, la date de naissance est obligatoire.');

    // L'autre parent : conjoint(e) lié(e) sur Moftal, ou son nom, ou « inconnu »
    const autreNumeroH = String(req.body.autreParentNumeroH || '').trim();
    const autreNom = String(req.body.autreParentNom || '').trim();
    const autreInconnu = req.body.autreParentInconnu === true;
    let conjoint = null;
    if (autreNumeroH) {
      conjoint = await conjointActif(user, autreNumeroH);
      if (!conjoint) c.erreurs.push('Ce conjoint n\'est pas lié à vous sur Moftal.');
    } else if (!autreNom && !autreInconnu) {
      c.erreurs.push(String(user.genre).toUpperCase() === 'FEMME' ? 'Indiquez le père de l\'enfant.' : 'Indiquez la mère de l\'enfant.');
    }
    if (c.erreurs.length) return res.status(400).json({ success: false, message: c.erreurs[0], erreurs: c.erreurs });

    const monRole = typeParent(user.genre);
    const nbEnfants = await ParentChildLink.count({
      where: { parentNumeroH: user.numeroH, parentType: monRole, status: { [Op.in]: ['active', 'pending'] }, isActive: true }
    });

    // Même extrait (numéro + commune + année) déjà enregistré : c'est le même
    // enfant seulement si la date de naissance est la même — jamais le numéro seul.
    if (c.cle) {
      const existante = await EnfantSansCompte.findOne({ where: { extraitCle: c.cle, isActive: true } });
      if (existante) {
        if (!memeDate(existante.dateNaissance, c.dateNaissance)) {
          return res.status(409).json({ success: false, message: 'Un autre enfant est déjà enregistré avec ce numéro d\'extrait, dans cette commune et cette année. Vérifiez le numéro, la commune, l\'année et la date de naissance.' });
        }
        if (normaliserPrenom(existante.prenom) !== normaliserPrenom(c.prenom) && req.body.confirmerMemeEnfant !== true) {
          return res.status(409).json({ success: false, code: 'CONFIRMER_MEME_ENFANT', prenomExistant: existante.prenom,
            message: `Cet extrait correspond déjà à l'enfant « ${existante.prenom} ». Est-ce bien le même enfant ?` });
        }
        const cible = existante.fusionneAvec || existante.numero;
        await lierParent(user.numeroH, cible, monRole);
        if (conjoint) await lierParent(conjoint.numeroH, cible, typeParent(conjoint.genre));
        const nom = [user.prenom, user.nomFamille].filter(Boolean).join(' ');
        const aPrevenir = new Set([existante.creePar, ...(await parentsDeLaFiche(cible)).map((l) => l.parentNumeroH)]);
        aPrevenir.delete(user.numeroH);
        for (const p of aPrevenir) {
          try {
            await Notification.createNotification({ recipientNumeroH: p, type: 'general', title: 'Enfant ajouté par l\'autre parent',
              message: `${nom} a aussi ajouté ${existante.prenom} comme son enfant.`, relatedId: existante.id });
          } catch { /* */ }
        }
        return res.json({ success: true, dejaEnregistre: true, message: `${existante.prenom} était déjà enregistré(e) : il/elle est maintenant aussi relié(e) à vous.`, enfant: ficheCommeMembre(existante) });
      }
    }

    if (nbEnfants >= MAX_ENFANTS) {
      return res.status(400).json({ success: false, message: `Vous avez déjà ${MAX_ENFANTS} enfants — c'est le maximum autorisé.` });
    }

    const photo = await enregistrerPhoto(req.body.photo);
    const fiche = await EnfantSansCompte.create({
      numero: nouveauNumeroFiche(),
      prenom: c.prenom,
      nomFamille: String(req.body.nomFamille || user.nomFamille || '').trim() || null,
      genre: c.genre,
      estVivant: c.estVivant,
      dateNaissance: c.dateNaissance,
      dateDeces: c.estVivant ? null : c.dateDeces,
      photo,
      quartierNaissance: String(req.body.quartierNaissance || '').trim() || null,
      extraitNumero: c.cle ? c.papiers[0] : null,
      extraitCommune: c.cle ? c.papiers[1] : null,
      extraitAnnee: c.cle ? c.papiers[2] : null,
      extraitCle: c.cle,
      autreParentNom: conjoint ? null : (autreNom || null),
      creePar: user.numeroH
    });
    await lierParent(user.numeroH, fiche.numero, monRole);
    if (conjoint) {
      await lierParent(conjoint.numeroH, fiche.numero, typeParent(conjoint.genre));
      try {
        await Notification.createNotification({ recipientNumeroH: conjoint.numeroH, type: 'general', title: 'Nouvel enfant dans votre famille',
          message: `${[user.prenom, user.nomFamille].filter(Boolean).join(' ')} a ajouté votre enfant ${fiche.prenom}. Il/elle apparaît maintenant dans votre arbre.`, relatedId: fiche.id });
      } catch { /* */ }
    }
    res.status(201).json({ success: true, message: `${fiche.prenom} a été ajouté(e) à votre famille.`, enfant: ficheCommeMembre(fiche, { avecPapiers: true }) });
  } catch (error) {
    console.error('Erreur ajout enfant sans compte:', error);
    res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Erreur serveur lors de l\'ajout de l\'enfant' });
  }
});

async function ficheDuParent(req, res) {
  await ensureTableFiches();
  const fiche = await EnfantSansCompte.findOne({ where: { id: req.params.id, isActive: true } });
  if (!fiche) { res.status(404).json({ success: false, message: 'Enfant introuvable' }); return null; }
  if (!(await estParentDeLaFiche(req.user.numeroH, fiche))) { res.status(403).json({ success: false, message: 'Seuls les parents de cet enfant peuvent faire cela.' }); return null; }
  return fiche;
}

// PUT /api/parent-child/enfants-sans-compte/:id — corriger la fiche (tant que l'enfant n'a pas rejoint Moftal)
router.put('/enfants-sans-compte/:id', async (req, res) => {
  try {
    const fiche = await ficheDuParent(req, res); if (!fiche) return;
    if (fiche.fusionneAvec) return res.status(400).json({ success: false, message: 'Cet enfant a maintenant son propre compte : c\'est lui qui gère son profil.' });
    const c = lireChampsEnfant(req.body, { creation: false });
    const dateFinale = c.dateNaissance || fiche.dateNaissance;
    if (c.cle && !dateFinale) c.erreurs.push('Avec l\'extrait de naissance, la date de naissance est obligatoire.');
    if (c.erreurs.length) return res.status(400).json({ success: false, message: c.erreurs[0] });
    if (c.cle) {
      const autre = await EnfantSansCompte.findOne({ where: { extraitCle: c.cle, isActive: true, id: { [Op.ne]: fiche.id } } });
      if (autre) return res.status(409).json({ success: false, message: 'Un autre enfant est déjà enregistré avec ce numéro d\'extrait, dans cette commune et cette année.' });
    }
    const maj = {};
    if (req.body.prenom !== undefined) maj.prenom = c.prenom;
    if (req.body.nomFamille !== undefined) maj.nomFamille = String(req.body.nomFamille || '').trim() || null;
    if (req.body.genre !== undefined) maj.genre = c.genre;
    if (c.estVivant !== undefined) maj.estVivant = c.estVivant;
    if (req.body.dateNaissance !== undefined) maj.dateNaissance = c.dateNaissance;
    if (req.body.dateDeces !== undefined || c.estVivant === true) maj.dateDeces = (c.estVivant ?? fiche.estVivant) ? null : c.dateDeces;
    if (req.body.quartierNaissance !== undefined) maj.quartierNaissance = String(req.body.quartierNaissance || '').trim() || null;
    if (req.body.photo !== undefined && req.body.photo) maj.photo = await enregistrerPhoto(req.body.photo);
    if (c.nbPapiers === 3) Object.assign(maj, { extraitNumero: c.papiers[0], extraitCommune: c.papiers[1], extraitAnnee: c.papiers[2], extraitCle: c.cle });
    if (req.body.retirerExtrait === true) Object.assign(maj, { extraitNumero: null, extraitCommune: null, extraitAnnee: null, extraitCle: null });
    if (req.body.autreParentNom !== undefined) maj.autreParentNom = String(req.body.autreParentNom || '').trim() || null;
    // Relier maintenant l'autre parent (couple lié depuis)
    if (req.body.autreParentNumeroH) {
      const conjoint = await conjointActif(req.user, String(req.body.autreParentNumeroH).trim());
      if (!conjoint) return res.status(400).json({ success: false, message: 'Ce conjoint n\'est pas lié à vous sur Moftal.' });
      await lierParent(conjoint.numeroH, fiche.numero, typeParent(conjoint.genre));
      maj.autreParentNom = null;
    }
    await fiche.update(maj);
    res.json({ success: true, message: 'Fiche mise à jour.', enfant: ficheCommeMembre(fiche, { avecPapiers: true }) });
  } catch (error) {
    console.error('Erreur modification enfant sans compte:', error);
    res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Erreur serveur' });
  }
});

// DELETE /api/parent-child/enfants-sans-compte/:id — retirer la fiche (erreur de saisie)
router.delete('/enfants-sans-compte/:id', async (req, res) => {
  try {
    const fiche = await ficheDuParent(req, res); if (!fiche) return;
    if (fiche.fusionneAvec) return res.status(400).json({ success: false, message: 'Cet enfant a maintenant son propre compte.' });
    await ParentChildLink.update({ isActive: false }, { where: { childNumeroH: fiche.numero } });
    await fiche.update({ isActive: false });
    res.json({ success: true, message: 'Enfant retiré.' });
  } catch (error) {
    console.error('Erreur suppression enfant sans compte:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/parent-child/enfants-sans-compte/:id/correspondances — comptes qui pourraient être cet enfant
router.get('/enfants-sans-compte/:id/correspondances', async (req, res) => {
  try {
    const fiche = await ficheDuParent(req, res); if (!fiche) return;
    if (fiche.fusionneAvec) return res.json({ success: true, correspondances: [] });
    res.json({ success: true, correspondances: await comptesCorrespondants(fiche) });
  } catch (error) {
    console.error('Erreur correspondances enfant:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/parent-child/enfants-sans-compte/:id/fusionner { numeroH } — le parent confirme « c'est mon enfant »
router.post('/enfants-sans-compte/:id/fusionner', async (req, res) => {
  try {
    const fiche = await ficheDuParent(req, res); if (!fiche) return;
    if (fiche.fusionneAvec) return res.status(400).json({ success: false, message: 'Cette fiche est déjà reliée à un compte.' });
    const numeroH = String(req.body.numeroH || '').trim();
    const possibles = await comptesCorrespondants(fiche);
    if (!possibles.some((p) => p.numeroH === numeroH)) {
      return res.status(400).json({ success: false, message: 'Ce compte ne correspond pas à cet enfant (prénom, date de naissance ou parents différents).' });
    }
    await fusionnerFiche(fiche, numeroH);
    res.json({ success: true, message: `${fiche.prenom} est maintenant relié(e) à son compte.` });
  } catch (error) {
    console.error('Erreur fusion par le parent:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/parent-child/enfants-sans-compte/:id/annuler-fusion — fusion faite par erreur
router.post('/enfants-sans-compte/:id/annuler-fusion', async (req, res) => {
  try {
    const fiche = await ficheDuParent(req, res); if (!fiche) return;
    if (!fiche.fusionneAvec) return res.status(400).json({ success: false, message: 'Cette fiche n\'est reliée à aucun compte.' });
    const ancien = fiche.fusionneAvec;
    await annulerFusion(fiche);
    try {
      await Notification.createNotification({ recipientNumeroH: ancien, type: 'general', title: 'Lien avec une fiche annulé',
        message: `Un parent a indiqué que la fiche « ${fiche.prenom} » n'était pas vous : le lien a été annulé.`, relatedId: fiche.id });
    } catch { /* */ }
    res.json({ success: true, message: 'Fusion annulée : la fiche de l\'enfant est revenue comme avant.' });
  } catch (error) {
    console.error('Erreur annulation fusion:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/parent-child/rejoindre-ma-fiche — l'enfant devenu grand retrouve la fiche créée par ses parents
router.post('/rejoindre-ma-fiche', async (req, res) => {
  try {
    await ensureTableFiches();
    const user = req.user;
    const cle = cleExtrait({ numero: req.body.extraitNumero, commune: req.body.extraitCommune, annee: req.body.extraitAnnee });
    if (!cle) return res.status(400).json({ success: false, message: 'Remplissez le numéro, la commune et l\'année de votre extrait de naissance.' });
    if (!user.dateNaissance) return res.status(400).json({ success: false, message: 'Ajoutez d\'abord votre date de naissance dans votre profil.' });
    const fiche = await EnfantSansCompte.findOne({ where: { extraitCle: cle, isActive: true, fusionneAvec: null, estVivant: true } });
    // Numéro + commune + année + date de naissance doivent tous correspondre
    if (!fiche || !memeDate(fiche.dateNaissance, user.dateNaissance)) {
      return res.status(404).json({ success: false, message: 'Aucune fiche ne correspond à cet extrait et à votre date de naissance. Vérifiez avec vos parents le numéro, la commune et l\'année.' });
    }
    if (await estParentDeLaFiche(user.numeroH, fiche)) {
      return res.status(400).json({ success: false, message: 'Vous êtes parent de cette fiche : seul l\'enfant peut la rejoindre.' });
    }
    if (normaliserPrenom(fiche.prenom) !== normaliserPrenom(user.prenom) && req.body.confirmer !== true) {
      return res.status(409).json({ success: false, code: 'CONFIRMER_PRENOM', prenomFiche: fiche.prenom,
        message: `Vos parents vous ont enregistré(e) sous le prénom « ${fiche.prenom} ». Est-ce bien vous ?` });
    }
    await fusionnerFiche(fiche, user.numeroH);
    res.json({ success: true, message: 'Vous êtes maintenant relié(e) à vos parents : votre arbre est fusionné avec le leur.' });
  } catch (error) {
    console.error('Erreur rejoindre ma fiche:', error);
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
      const isImage = uploadedFile.mimetype.startsWith('image/');
      mediaUrl = isImage
        ? await uploadToImageKit(uploadedFile.buffer, uploadedFile.originalname, 'parent-child')
        : await uploadToR2(uploadedFile.buffer, uploadedFile.originalname, uploadedFile.mimetype, 'parent-child');
      uploadToIDrive(uploadedFile.buffer, uploadedFile.originalname, uploadedFile.mimetype, 'parent-child').catch(() => {});
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
