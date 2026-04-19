import express from 'express';
import { authenticate } from '../middleware/auth.js';
import User from '../models/User.js';
import DeceasedMember from '../models/DeceasedMember.js';
import FamilyTreeConfirmation from '../models/FamilyTreeConfirmation.js';
import FamilyTreeMessage from '../models/FamilyTreeMessage.js';
import ParentChildLink from '../models/ParentChildLink.js';
import { FamilyTree } from '../models/additional.js';
import { Op } from 'sequelize';
import Notification from '../models/Notification.js';
import CoupleLink from '../models/CoupleLink.js';

const router = express.Router();

// Toutes les routes nécessitent l'authentification
router.use(authenticate);

// ========== GESTION DES ARBRES GÉNÉALOGIQUES ==========

// @route   GET /api/family-tree/tree
// @desc    Récupérer l'arbre généalogique de l'utilisateur
// @access  Authentifié
router.get('/tree', async (req, res) => {
  try {
    const user = req.user;
    
    // Trouver l'arbre auquel appartient l'utilisateur
    let tree = await FamilyTree.findOne({
      where: {
        [Op.or]: [
          { rootMember: user.numeroH },
          { members: { [Op.contains]: [user.numeroH] } },
          { chefFamille1: user.numeroH },
          { chefFamille2: user.numeroH }
        ],
        isActive: true
      }
    });

    // Si l'arbre n'existe pas, le créer automatiquement
    if (!tree) {
      tree = await createOrFindFamilyTree(user);
    }

    // Récupérer tous les membres de l'arbre (vivants et décédés)
    const members = await getTreeMembers(tree);
    const deceasedMembers = await getTreeDeceasedMembers(tree);

    res.json({
      success: true,
      tree: {
        id: tree.id,
        rootMember: tree.rootMember,
        chefFamille1: tree.chefFamille1,
        chefFamille2: tree.chefFamille2,
        members,
        deceasedMembers,
        memberCount: members.length,
        familyCode: members.length >= 10 ? (tree.familyCode || null) : null,
        bloodNumber: members.length >= 10 ? (tree.bloodNumber || null) : null,
        familyName: tree.familyName || null,
        codeUnlocked: members.length >= 10
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'arbre:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération de l\'arbre'
    });
  }
});

// Fonction pour créer ou trouver un arbre généalogique
async function createOrFindFamilyTree(user) {
  // Vérifier si l'utilisateur a des parents
  const numeroHPere = user.numeroHPere;
  const numeroHMere = user.numeroHMere;

  // Si l'utilisateur a des parents, chercher un arbre existant avec ces parents
  if (numeroHPere || numeroHMere) {
    const existingTree = await FamilyTree.findOne({
      where: {
        [Op.or]: [
          { numeroHPere, numeroHMere },
          { numeroHPere, numeroHMere: null },
          { numeroHPere: null, numeroHMere }
        ],
        isActive: true
      }
    });

    if (existingTree) {
      // Ajouter l'utilisateur à l'arbre existant
      const members = existingTree.members || [];
      if (!members.includes(user.numeroH)) {
        members.push(user.numeroH);
        await existingTree.update({ members });
      }
      return existingTree;
    }
  }

  // Créer un nouvel arbre
  const newTree = await FamilyTree.create({
    rootMember: user.numeroH,
    numeroHPere: user.numeroHPere || null,
    numeroHMere: user.numeroHMere || null,
    members: [user.numeroH],
    deceasedMembers: []
  });

  return newTree;
}

// Fonction pour récupérer les membres vivants de l'arbre
async function getTreeMembers(tree) {
  const members = tree.members || [];
  const users = await User.findAll({
    where: {
      numeroH: { [Op.in]: members },
      type: 'vivant',
      isActive: true
    },
    attributes: ['numeroH', 'prenom', 'nomFamille', 'genre', 'dateNaissance', 'photo']
  });
  return users;
}

// Fonction pour récupérer les membres décédés de l'arbre
async function getTreeDeceasedMembers(tree) {
  const deceasedMembers = tree.deceasedMembers || [];
  const deceased = await DeceasedMember.findAll({
    where: {
      numeroHD: { [Op.in]: deceasedMembers },
      isActive: true
    }
  });
  return deceased;
}

// ========== GESTION DES CONFIRMATIONS PAR LES PARENTS ==========

// @route   POST /api/family-tree/request-access
// @desc    Demander l'accès à l'arbre familial (créer des confirmations)
// @access  Authentifié
router.post('/request-access', async (req, res) => {
  try {
    const user = req.user;
    const { numeroHPere, numeroHMere } = req.body;

    // Vérifier que l'utilisateur a fourni au moins un parent
    if (!numeroHPere && !numeroHMere) {
      return res.status(400).json({
        success: false,
        message: 'Au moins un parent (père ou mère) est requis'
      });
    }

    const confirmations = [];

    // Si le père est fourni, vérifier s'il est vivant ou décédé
    if (numeroHPere) {
      const pere = await User.findOne({ where: { numeroH: numeroHPere, type: 'vivant' } });
      
      if (pere && pere.isActive) {
        // Père vivant : créer une confirmation
        const confirmation = await FamilyTreeConfirmation.create({
          childNumeroH: user.numeroH,
          parentNumeroH: numeroHPere,
          parentType: 'pere',
          status: 'pending'
        });
        confirmations.push(confirmation);
        // Notifier le père
        try {
          const childName = [user.prenom, user.nomFamille].filter(Boolean).join(' ') || user.numeroH;
          await Notification.createNotification({
            recipientNumeroH: numeroHPere,
            type: 'tree_request',
            title: 'Demande d\'accès à l\'arbre familial',
            message: `${childName} demande à rejoindre votre arbre généalogique (en tant qu'enfant).`,
            relatedId: confirmation.id
          });
        } catch (e) { console.error('Notif tree_request (père):', e.message); }
      } else {
        // Père décédé : accès direct (pas de confirmation nécessaire)
        // L'utilisateur sera ajouté directement à l'arbre
      }
    }

    // Si la mère est fournie, vérifier si elle est vivante ou décédée
    if (numeroHMere) {
      const mere = await User.findOne({ where: { numeroH: numeroHMere, type: 'vivant' } });

      if (mere && mere.isActive) {
        // Mère vivante : créer une confirmation
        const confirmation = await FamilyTreeConfirmation.create({
          childNumeroH: user.numeroH,
          parentNumeroH: numeroHMere,
          parentType: 'mere',
          status: 'pending'
        });
        confirmations.push(confirmation);
        // Notifier la mère
        try {
          const childName = [user.prenom, user.nomFamille].filter(Boolean).join(' ') || user.numeroH;
          await Notification.createNotification({
            recipientNumeroH: numeroHMere,
            type: 'tree_request',
            title: 'Demande d\'accès à l\'arbre familial',
            message: `${childName} demande à rejoindre votre arbre généalogique (en tant qu'enfant).`,
            relatedId: confirmation.id
          });
        } catch (e) { console.error('Notif tree_request (mère):', e.message); }
      } else {
        // Mère décédée : accès direct (pas de confirmation nécessaire)
      }
    }

    // Si les deux parents sont décédés, ajouter directement à l'arbre
    const pereVivant = numeroHPere ? await User.findOne({ where: { numeroH: numeroHPere, type: 'vivant', isActive: true } }) : null;
    const mereVivante = numeroHMere ? await User.findOne({ where: { numeroH: numeroHMere, type: 'vivant', isActive: true } }) : null;

    if (!pereVivant && !mereVivante) {
      // Les deux parents sont décédés ou n'existent pas, accès direct
      await addUserToFamilyTree(user.numeroH, numeroHPere, numeroHMere);
    }

    res.json({
      success: true,
      message: confirmations.length > 0 
        ? 'Demandes de confirmation envoyées aux parents vivants' 
        : 'Accès direct accordé (parents décédés)',
      confirmations
    });
  } catch (error) {
    console.error('Erreur lors de la demande d\'accès:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la demande d\'accès'
    });
  }
});

// @route   GET /api/family-tree/pending-confirmations
// @desc    Récupérer les confirmations en attente pour l'utilisateur (en tant que parent)
// @access  Authentifié
router.get('/pending-confirmations', async (req, res) => {
  try {
    const user = req.user;
    const confirmations = await FamilyTreeConfirmation.getPendingConfirmations(user.numeroH);

    // Récupérer les informations des enfants
    const confirmationsWithChildren = await Promise.all(
      confirmations.map(async (conf) => {
        const child = await User.findOne({
          where: { numeroH: conf.childNumeroH },
          attributes: ['numeroH', 'prenom', 'nomFamille', 'dateNaissance', 'photo']
        });
        return {
          ...conf.toJSON(),
          child
        };
      })
    );

    res.json({
      success: true,
      confirmations: confirmationsWithChildren
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des confirmations:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des confirmations'
    });
  }
});

// @route   POST /api/family-tree/confirm-access/:confirmationId
// @desc    Confirmer l'accès d'un enfant à l'arbre familial
// @access  Authentifié
router.post('/confirm-access/:confirmationId', async (req, res) => {
  try {
    const { confirmationId } = req.params;
    const user = req.user;

    const confirmation = await FamilyTreeConfirmation.findByPk(confirmationId);

    if (!confirmation) {
      return res.status(404).json({
        success: false,
        message: 'Confirmation non trouvée'
      });
    }

    // Vérifier que l'utilisateur est bien le parent concerné
    if (confirmation.parentNumeroH !== user.numeroH) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à confirmer cette demande'
      });
    }

    // Confirmer l'accès
    await FamilyTreeConfirmation.confirmAccess(confirmation.childNumeroH, user.numeroH);

    // Créer ou activer le lien parent-enfant pour que la liaison s'applique partout (Mes Parents / Mes Enfants)
    const parentType = (confirmation.parentType === 'mere' ? 'mere' : 'pere');
    let link = await ParentChildLink.findOne({
      where: {
        parentNumeroH: user.numeroH,
        childNumeroH: confirmation.childNumeroH,
        parentType
      }
    });
    if (link) {
      link.status = 'active';
      link.confirmedAt = new Date();
      link.isActive = true;
      await link.save();
    } else {
      await ParentChildLink.create({
        parentNumeroH: user.numeroH,
        childNumeroH: confirmation.childNumeroH,
        parentType,
        status: 'active',
        confirmedAt: new Date(),
        codeLiaison: null,
        numeroMaternite: null
      });
    }

    // Récupérer les parents de l'enfant pour le rattacher au bon arbre
    const child = await User.findOne({
      where: { numeroH: confirmation.childNumeroH }
    });

    // Ajouter l'enfant à l'arbre familial existant (basé sur numeroHPere / numeroHMere)
    await addUserToFamilyTree(
      confirmation.childNumeroH,
      child?.numeroHPere || null,
      child?.numeroHMere || null
    );

    res.json({
      success: true,
      message: 'Accès confirmé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la confirmation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la confirmation'
    });
  }
});

// @route   POST /api/family-tree/reject-access/:confirmationId
// @desc    Rejeter l'accès d'un enfant à l'arbre familial
// @access  Authentifié
router.post('/reject-access/:confirmationId', async (req, res) => {
  try {
    const { confirmationId } = req.params;
    const user = req.user;

    const confirmation = await FamilyTreeConfirmation.findByPk(confirmationId);

    if (!confirmation) {
      return res.status(404).json({
        success: false,
        message: 'Confirmation non trouvée'
      });
    }

    if (confirmation.parentNumeroH !== user.numeroH) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à rejeter cette demande'
      });
    }

    confirmation.status = 'rejected';
    confirmation.rejectedAt = new Date();
    await confirmation.save();

    res.json({
      success: true,
      message: 'Accès rejeté'
    });
  } catch (error) {
    console.error('Erreur lors du rejet:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors du rejet'
    });
  }
});

// ========== GESTION DES CHEFS DE FAMILLE ==========

// @route   PUT /api/family-tree/set-family-heads
// @desc    Nommer les chefs de famille (2 par arbre)
// @access  Authentifié (doit être chef de famille ou admin)
router.put('/set-family-heads', async (req, res) => {
  try {
    const user = req.user;
    const { chefFamille1, chefFamille2 } = req.body;

    if (!chefFamille1 && !chefFamille2) {
      return res.status(400).json({
        success: false,
        message: 'Au moins un chef de famille est requis'
      });
    }

    // Trouver l'arbre de l'utilisateur
    const tree = await FamilyTree.findOne({
      where: {
        [Op.or]: [
          { rootMember: user.numeroH },
          { members: { [Op.contains]: [user.numeroH] } },
          { chefFamille1: user.numeroH },
          { chefFamille2: user.numeroH }
        ],
        isActive: true
      }
    });

    if (!tree) {
      return res.status(404).json({
        success: false,
        message: 'Arbre généalogique non trouvé'
      });
    }

    // Vérifier que l'utilisateur est un chef de famille actuel ou admin
    const isCurrentHead = tree.chefFamille1 === user.numeroH || tree.chefFamille2 === user.numeroH;
    const isAdmin =
      user.role === 'admin' ||
      user.role === 'super-admin' ||
      user.numeroH === 'G7C7P7R7E7F7 7';

    if (!isCurrentHead && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Seuls les chefs de famille ou les administrateurs peuvent nommer les chefs'
      });
    }

    // Vérifier que les nouveaux chefs sont membres de l'arbre
    const members = tree.members || [];
    if (chefFamille1 && !members.includes(chefFamille1)) {
      return res.status(400).json({
        success: false,
        message: 'Le premier chef de famille doit être membre de l\'arbre'
      });
    }
    if (chefFamille2 && !members.includes(chefFamille2)) {
      return res.status(400).json({
        success: false,
        message: 'Le deuxième chef de famille doit être membre de l\'arbre'
      });
    }

    // Mettre à jour les chefs de famille
    await tree.update({
      chefFamille1: chefFamille1 || tree.chefFamille1,
      chefFamille2: chefFamille2 || tree.chefFamille2
    });

    res.json({
      success: true,
      message: 'Chefs de famille mis à jour avec succès',
      tree
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des chefs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la mise à jour des chefs'
    });
  }
});

// ========== GESTION DES DÉCÉDÉS ==========

// @route   POST /api/family-tree/add-deceased
// @desc    Ajouter un décédé à l'arbre généalogique (sans compte)
// @access  Authentifié
router.post('/add-deceased', async (req, res) => {
  try {
    const user = req.user;
    const deceasedData = req.body;

    // Créer le membre décédé
    const deceased = await DeceasedMember.create({
      ...deceasedData,
      createdBy: user.numeroH
    });

    // Ajouter le décédé à l'arbre familial
    await addDeceasedToFamilyTree(deceased.numeroHD, deceased.numeroHPere, deceased.numeroHMere);

    res.json({
      success: true,
      message: 'Décédé ajouté à l\'arbre généalogique avec succès',
      deceased
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout du décédé:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'ajout du décédé'
    });
  }
});

// ========== MESSAGERIE FAMILIALE (type WhatsApp) ==========

// @route   GET /api/family-tree/messages
// @desc    Récupérer les messages familiaux (par nom de famille)
//          - Utilisateur classique : uniquement sa propre famille (nomFamille)
//          - Admin / super-admin / master-admin : peut passer ?familyName=XXX pour tout voir
// @access  Authentifié
router.get('/messages', async (req, res) => {
  try {
    const user = req.user;
    const {
      familyName: requestedFamilyName,
      limit = 100,
      offset = 0
    } = req.query;

    const isAdmin =
      user.role === 'admin' ||
      user.role === 'super-admin' ||
      user.numeroH === 'G0C0P0R0E0F0 0' ||
      user.isMasterAdmin ||
      user.canViewAll;

    const familyName =
      (isAdmin && requestedFamilyName) ||
      user.nomFamille ||
      user.familyName;

    if (!familyName) {
      return res.status(400).json({
        success: false,
        message: 'Nom de famille introuvable pour l\'utilisateur connecté'
      });
    }

    const messages = await FamilyTreeMessage.getFamilyMessages(
      familyName,
      parseInt(limit, 10),
      parseInt(offset, 10)
    );

    const messagesWithAuthors = await Promise.all(
      messages.map(async (msg) => {
        const author = await User.findOne({ where: { numeroH: msg.numeroH } });
        return {
          ...msg.toJSON(),
          authorName: author ? `${author.prenom} ${author.nomFamille}` : 'Membre de la famille',
          familyName
        };
      })
    );

    res.json({
      success: true,
      familyName,
      messages: messagesWithAuthors
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des messages familiaux:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des messages familiaux'
    });
  }
});

// @route   POST /api/family-tree/messages
// @desc    Envoyer un message dans la conversation familiale
// @access  Authentifié
router.post('/messages', async (req, res) => {
  try {
    const user = req.user;
    const { content, messageType = 'text', mediaUrl } = req.body;

    const familyName = user.nomFamille || user.familyName;

    if (!familyName) {
      return res.status(400).json({
        success: false,
        message: 'Nom de famille introuvable pour l\'utilisateur connecté'
      });
    }

    if ((!content || !String(content).trim()) && !mediaUrl) {
      return res.status(400).json({
        success: false,
        message: 'Le contenu du message est requis'
      });
    }

    const message = await FamilyTreeMessage.create({
      familyName,
      numeroH: user.numeroH,
      messageType: messageType || 'text',
      content: String(content || '').trim(),
      mediaUrl: mediaUrl || null
    });

    res.status(201).json({
      success: true,
      message: {
        ...message.toJSON(),
        authorName: `${user.prenom} ${user.nomFamille}`,
        familyName
      }
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi du message familial:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'envoi du message familial'
    });
  }
});

// Fonction pour ajouter un utilisateur à l'arbre familial
async function addUserToFamilyTree(numeroH, numeroHPere, numeroHMere) {
  // Trouver ou créer l'arbre
  let tree = await FamilyTree.findOne({
    where: {
      [Op.or]: [
        { numeroHPere, numeroHMere },
        { members: { [Op.contains]: [numeroH] } }
      ],
      isActive: true
    }
  });

  if (!tree && (numeroHPere || numeroHMere)) {
    // Chercher un arbre existant avec les mêmes parents
    tree = await FamilyTree.findOne({
      where: {
        [Op.or]: [
          { numeroHPere, numeroHMere },
          { numeroHPere, numeroHMere: null },
          { numeroHPere: null, numeroHMere }
        ],
        isActive: true
      }
    });
  }

  if (tree) {
    // Ajouter l'utilisateur à l'arbre existant
    const members = tree.members || [];
    if (!members.includes(numeroH)) {
      members.push(numeroH);
      await tree.update({ members });
      // Attribuer le code F+S dès 10 membres
      await assignFamilyCodeIfNeeded(tree, members);
    }
  } else {
    // Créer un nouvel arbre
    const user = await User.findOne({ where: { numeroH } });
    const nomFamille = user?.nomFamille || null;
    tree = await FamilyTree.create({
      rootMember: numeroH,
      numeroHPere: numeroHPere || user?.numeroHPere || null,
      numeroHMere: numeroHMere || user?.numeroHMere || null,
      members: [numeroH],
      deceasedMembers: [],
      familyName: nomFamille
    });
  }

  return tree;
}

/**
 * Attribue automatiquement le code F<nomFamille>S<n> quand l'arbre atteint 10 membres.
 * Le bloodNumber (S) est le prochain entier disponible pour ce nom de famille.
 */
async function assignFamilyCodeIfNeeded(tree, members) {
  if (tree.familyCode) return; // déjà attribué
  if (members.length < 10) return;

  // Récupérer le nom de famille depuis le membre racine si pas encore défini
  let familyName = tree.familyName;
  if (!familyName) {
    const root = await User.findOne({ where: { numeroH: tree.rootMember } });
    familyName = root?.nomFamille || 'Inconnu';
  }

  // Trouver le prochain bloodNumber disponible pour cette famille
  const existing = await FamilyTree.findAll({
    where: { familyName, bloodNumber: { [Op.not]: null } },
    order: [['bloodNumber', 'DESC']],
    limit: 1
  });
  const nextBlood = existing.length > 0 ? (existing[0].bloodNumber + 1) : 1;
  const code = `F${familyName}S${nextBlood}`;

  await tree.update({ familyCode: code, bloodNumber: nextBlood, familyName });
}

// Fonction pour ajouter un décédé à l'arbre familial
async function addDeceasedToFamilyTree(numeroHD, numeroHPere, numeroHMere) {
  // Trouver l'arbre avec les mêmes parents
  let tree = await FamilyTree.findOne({
    where: {
      [Op.or]: [
        { numeroHPere, numeroHMere },
        { numeroHPere, numeroHMere: null },
        { numeroHPere: null, numeroHMere }
      ],
      isActive: true
    }
  });

  if (tree) {
    // Ajouter le décédé à l'arbre existant
    const deceasedMembers = tree.deceasedMembers || [];
    if (!deceasedMembers.includes(numeroHD)) {
      deceasedMembers.push(numeroHD);
      await tree.update({ deceasedMembers });
    }
  } else {
    // Créer un nouvel arbre pour les décédés
    tree = await FamilyTree.create({
      rootMember: numeroHD,
      numeroHPere: numeroHPere || null,
      numeroHMere: numeroHMere || null,
      members: [],
      deceasedMembers: [numeroHD]
    });
  }

  return tree;
}

// ========== RETRAIT DE MEMBRES ==========

// @route   DELETE /api/family-tree/remove-member/:memberNumeroH
// @desc    Retirer un membre de l'arbre
//          - Un parent peut retirer son enfant (lien ParentChildLink vérifié)
//          - Un utilisateur peut se retirer lui-même
// @access  Authentifié
router.delete('/remove-member/:memberNumeroH', async (req, res) => {
  try {
    const user = req.user;
    const { memberNumeroH } = req.params;
    const isSelf = user.numeroH === memberNumeroH;

    // Vérifier autorisation : soit soi-même, soit parent confirmé
    if (!isSelf) {
      const isParent = await ParentChildLink.findOne({
        where: {
          parentNumeroH: user.numeroH,
          childNumeroH: memberNumeroH,
          status: 'active',
          isActive: true
        }
      });
      if (!isParent) {
        return res.status(403).json({
          success: false,
          message: 'Vous n\'êtes pas autorisé à retirer ce membre. Seul le membre lui-même ou un parent confirmé peut le faire.'
        });
      }
    }

    // Trouver l'arbre contenant ce membre
    const tree = await FamilyTree.findOne({
      where: {
        members: { [Op.contains]: [memberNumeroH] },
        isActive: true
      }
    });

    if (!tree) {
      return res.status(404).json({ success: false, message: 'Membre non trouvé dans un arbre actif.' });
    }

    const updatedMembers = (tree.members || []).filter(m => m !== memberNumeroH);
    await tree.update({ members: updatedMembers });

    res.json({ success: true, message: 'Membre retiré de l\'arbre généalogique.' });
  } catch (error) {
    console.error('Erreur remove-member:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ========== ACCÈS ARBRE DU CONJOINT ==========

// @route   GET /api/family-tree/spouse-tree/:spouseNumeroH
// @desc    Accéder à l'arbre du conjoint
//          - Visible uniquement si un lien couple actif existe
//          - Accès limité (juste liste membres) si union < 1 an
//          - Accès complet si union >= 1 an
// @access  Authentifié
router.get('/spouse-tree/:spouseNumeroH', async (req, res) => {
  try {
    const user = req.user;
    const { spouseNumeroH } = req.params;

    // Vérifier qu'un lien de couple actif existe entre les deux
    const coupleLink = await CoupleLink.findOne({
      where: {
        [Op.or]: [
          { husbandNumeroH: user.numeroH, wifeNumeroH: spouseNumeroH },
          { husbandNumeroH: spouseNumeroH, wifeNumeroH: user.numeroH }
        ],
        status: 'active',
        isActive: true,
        isArchived: false
      }
    });

    if (!coupleLink) {
      return res.status(403).json({
        success: false,
        message: 'Aucun lien de couple actif trouvé avec cet utilisateur.'
      });
    }

    // Calculer la durée du lien (en jours)
    const confirmedDate = coupleLink.confirmedAt || coupleLink.createdAt;
    const unionDays = confirmedDate
      ? Math.floor((Date.now() - new Date(confirmedDate).getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    const fullAccess = unionDays >= 365; // 1 an = 365 jours

    // Trouver l'arbre du conjoint
    const spouseTree = await FamilyTree.findOne({
      where: {
        [Op.or]: [
          { rootMember: spouseNumeroH },
          { members: { [Op.contains]: [spouseNumeroH] } }
        ],
        isActive: true
      }
    });

    if (!spouseTree) {
      return res.status(404).json({ success: false, message: 'Arbre du conjoint non trouvé.' });
    }

    const members = await getTreeMembers(spouseTree);

    if (!fullAccess) {
      // Accès limité : juste la liste des membres (prénom + nom de famille)
      return res.json({
        success: true,
        accessLevel: 'limited',
        unionDays,
        daysUntilFullAccess: 365 - unionDays,
        message: `Accès limité. Accès complet dans ${365 - unionDays} jour(s).`,
        tree: {
          id: spouseTree.id,
          memberCount: members.length,
          members: members.map(m => ({
            numeroH: m.numeroH,
            prenom: m.prenom,
            nomFamille: m.nomFamille,
            genre: m.genre
          }))
        }
      });
    }

    // Accès complet (union >= 1 an)
    const deceasedMembers = await getTreeDeceasedMembers(spouseTree);
    res.json({
      success: true,
      accessLevel: 'full',
      unionDays,
      tree: {
        id: spouseTree.id,
        rootMember: spouseTree.rootMember,
        chefFamille1: spouseTree.chefFamille1,
        chefFamille2: spouseTree.chefFamille2,
        members,
        deceasedMembers,
        memberCount: members.length,
        familyCode: members.length >= 10 ? (spouseTree.familyCode || null) : null,
        familyName: spouseTree.familyName || null,
        codeUnlocked: members.length >= 10
      }
    });
  } catch (error) {
    console.error('Erreur spouse-tree:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// @route   DELETE /api/family-tree/leave
// @desc    Se retirer soi-même de son arbre généalogique
// @access  Authentifié
router.delete('/leave', async (req, res) => {
  try {
    const user = req.user;

    const tree = await FamilyTree.findOne({
      where: {
        members: { [Op.contains]: [user.numeroH] },
        isActive: true
      }
    });

    if (!tree) {
      return res.status(404).json({ success: false, message: 'Vous n\'êtes dans aucun arbre actif.' });
    }

    const updatedMembers = (tree.members || []).filter(m => m !== user.numeroH);
    await tree.update({ members: updatedMembers });

    res.json({ success: true, message: 'Vous avez quitté l\'arbre généalogique.' });
  } catch (error) {
    console.error('Erreur leave tree:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

export default router;

