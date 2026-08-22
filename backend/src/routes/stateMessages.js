import express from 'express';
import multer from 'multer';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import StateMessage from '../models/StateMessage.js';
import Document from '../models/Document.js';
import User from '../models/User.js';
import { uploadToImageKit } from '../services/imagekitStorage.js';
import { uploadToR2 } from '../services/r2Storage.js';
import { uploadToIDrive } from '../services/idriveStorage.js';

const router = express.Router();

// Upload en mémoire pour les pièces jointes — jamais sur le disque du serveur
// (effacé à chaque redémarrage/redéploiement), envoyé ensuite vers le cloud.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé'), false);
    }
  }
});

// Toutes les routes nécessitent l'authentification
router.use(authenticate);

// ========== MESSAGES ==========

// @route   GET /api/state-messages/conversation/:documentId?
// @desc    Récupérer une conversation (avec ou sans document)
// @access  Authentifié
router.get('/conversation/:documentId?', async (req, res) => {
  try {
    const { documentId } = req.params;
    const user = req.user;

    let messages;
    if (documentId && documentId !== 'null') {
      // Vérifier que l'utilisateur a accès au document
      const document = await Document.findByPk(documentId);
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document non trouvé'
        });
      }

      // Vérifier les permissions
      if (document.uploadedBy !== user.numeroH && 
          document.recipient !== user.numeroH && 
          !document.isPublic &&
          user.role !== 'admin' && 
          user.role !== 'super-admin') {
        return res.status(403).json({
          success: false,
          message: 'Accès refusé à ce document'
        });
      }

      messages = await StateMessage.getConversation(documentId, user.numeroH);
    } else {
      // Messages généraux (sans document)
      messages = await StateMessage.getConversation(null, user.numeroH);
    }

    res.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération de la conversation'
    });
  }
});

// @route   GET /api/state-messages/my-messages
// @desc    Récupérer tous les messages de l'utilisateur
// @access  Authentifié
router.get('/my-messages', async (req, res) => {
  try {
    const user = req.user;
    const messages = await StateMessage.getUserMessages(user.numeroH);

    res.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des messages:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des messages'
    });
  }
});

// @route   GET /api/state-messages/unread-count
// @desc    Récupérer le nombre de messages non lus
// @access  Authentifié
router.get('/unread-count', async (req, res) => {
  try {
    const user = req.user;
    const count = await StateMessage.getUnreadCount(user.numeroH);

    res.json({
      success: true,
      unreadCount: count
    });
  } catch (error) {
    console.error('Erreur lors du comptage des messages non lus:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors du comptage'
    });
  }
});

// @route   POST /api/state-messages/send
// @desc    Envoyer un message
// @access  Authentifié
router.post('/send', upload.array('attachments', 5), async (req, res) => {
  try {
    const { documentId, recipientId, subject, content, messageType, priority, isImportant } = req.body;
    const user = req.user;

    if (!recipientId || !content) {
      return res.status(400).json({
        success: false,
        message: 'Destinataire et contenu sont requis'
      });
    }

    // Vérifier que le destinataire existe
    const recipient = await User.findByNumeroH(recipientId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Destinataire non trouvé'
      });
    }

    // Si un document est associé, vérifier les permissions
    if (documentId && documentId !== 'null') {
      const document = await Document.findByPk(documentId);
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document non trouvé'
        });
      }

      // Vérifier que l'utilisateur a accès au document
      if (document.uploadedBy !== user.numeroH && 
          document.recipient !== user.numeroH && 
          !document.isPublic &&
          user.role !== 'admin' && 
          user.role !== 'super-admin') {
        return res.status(403).json({
          success: false,
          message: 'Accès refusé à ce document'
        });
      }
    }

    // Traiter les pièces jointes — envoyées vers le stockage cloud (images vers
    // ImageKit, PDF/Word vers R2), jamais écrites sur le disque du serveur.
    const attachments = req.files ? await Promise.all(req.files.map(async (file) => {
      const url = file.mimetype.startsWith('image/')
        ? await uploadToImageKit(file.buffer, file.originalname, 'messages')
        : await uploadToR2(file.buffer, file.originalname, file.mimetype, 'messages');
      uploadToIDrive(file.buffer, file.originalname, file.mimetype, 'messages').catch(() => {});
      return {
        filename: file.originalname,
        url,
        size: file.size,
        mimetype: file.mimetype
      };
    })) : [];

    const message = await StateMessage.create({
      documentId: documentId && documentId !== 'null' ? documentId : null,
      senderId: user.numeroH,
      senderName: `${user.prenom} ${user.nomFamille}`,
      recipientId,
      recipientName: `${recipient.prenom} ${recipient.nomFamille}`,
      subject: subject || null,
      content,
      messageType: messageType || 'general',
      attachments,
      priority: priority || 'normal',
      isImportant: isImportant === 'true' || isImportant === true
    });

    res.status(201).json({
      success: true,
      message: 'Message envoyé avec succès',
      data: message
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi du message:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'envoi du message'
    });
  }
});

// @route   PUT /api/state-messages/:messageId/read
// @desc    Marquer un message comme lu
// @access  Authentifié
router.put('/:messageId/read', async (req, res) => {
  try {
    const { messageId } = req.params;
    const user = req.user;

    const message = await StateMessage.markAsRead(messageId, user.numeroH);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Message marqué comme lu'
    });
  } catch (error) {
    console.error('Erreur lors du marquage du message:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors du marquage'
    });
  }
});

// @route   PUT /api/state-messages/conversation/:documentId/read
// @desc    Marquer toute une conversation comme lue
// @access  Authentifié
router.put('/conversation/:documentId/read', async (req, res) => {
  try {
    const { documentId } = req.params;
    const user = req.user;

    const docId = documentId && documentId !== 'null' ? documentId : null;
    await StateMessage.markConversationAsRead(docId, user.numeroH);

    res.json({
      success: true,
      message: 'Conversation marquée comme lue'
    });
  } catch (error) {
    console.error('Erreur lors du marquage de la conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors du marquage'
    });
  }
});

// @route   GET /api/state-messages/admin/conversations
// @desc    Récupérer toutes les conversations (Admin uniquement)
// @access  Admin uniquement
router.get('/admin/conversations', requireAdmin, async (req, res) => {
  try {
    const { documentId, userId } = req.query;

    let where = {};
    if (documentId) {
      where.documentId = documentId;
    }
    if (userId) {
      where[Op.or] = [
        { senderId: userId },
        { recipientId: userId }
      ];
    }

    const messages = await StateMessage.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: 100
    });

    res.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération'
    });
  }
});

export default router;

