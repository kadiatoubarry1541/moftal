import express from 'express';
import multer from 'multer';
import { Op } from 'sequelize';
import Document from '../models/Document.js';
import DocumentPermission from '../models/DocumentPermission.js';
import DocumentValidation from '../models/DocumentValidation.js';
import { authenticate } from '../middleware/auth.js';
import { uploadToR2 } from '../services/r2Storage.js';
import { uploadToIDrive } from '../services/idriveStorage.js';

const router = express.Router();

// Upload en mémoire — jamais sur le disque du serveur (effacé à chaque
// redémarrage/redéploiement) — puis envoyé vers le stockage cloud.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Accepter seulement les PDF
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers PDF sont acceptés'));
    }
  }
});

// Toutes les routes nécessitent l'authentification
router.use(authenticate);

// ========== DOCUMENTS ==========

// @route   GET /api/documents/list
// @desc    Récupérer les documents de l'utilisateur
// @access  Authentifié
router.get('/list', async (req, res) => {
  try {
    const user = req.user;
    
    const documents = await Document.findAll({
      where: {
        [Op.or]: [
          { uploadedBy: user.numeroH },
          { recipient: user.numeroH },
          { isPublic: true }
        ]
      },
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      documents
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des documents:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des documents'
    });
  }
});

// @route   POST /api/documents/upload
// @desc    Uploader un document
// @access  Authentifié
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { title, type, description, category, tags, recipient, isPublic } = req.body;
    const user = req.user;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier fourni'
      });
    }

    const fileUrl = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype, 'documents');
    uploadToIDrive(req.file.buffer, req.file.originalname, req.file.mimetype, 'documents').catch(() => {});

    const document = await Document.create({
      title,
      type,
      description,
      category,
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      uploadedBy: user.numeroH,
      recipient: recipient || null,
      isPublic: isPublic === 'true' || isPublic === true,
      status: 'approved' // Automatiquement approuvé si uploadé par l'utilisateur
    });

    res.status(201).json({
      success: true,
      message: 'Document uploadé avec succès',
      document
    });
  } catch (error) {
    console.error('Erreur lors de l\'upload du document:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'upload du document'
    });
  }
});

// @route   PUT /api/documents/:documentId
// @desc    Modifier un document
// @access  Authentifié (propriétaire uniquement)
router.put('/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { title, description, tags, isPublic } = req.body;
    const user = req.user;

    const document = await Document.findByPk(documentId);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouvé'
      });
    }

    // Vérifier que l'utilisateur est le propriétaire
    if (document.uploadedBy !== user.numeroH) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Vous n\'êtes pas le propriétaire de ce document.'
      });
    }

    document.title = title || document.title;
    document.description = description || document.description;
    document.tags = tags ? tags.split(',').map(t => t.trim()) : document.tags;
    document.isPublic = isPublic !== undefined ? isPublic : document.isPublic;
    await document.save();

    res.json({
      success: true,
      message: 'Document modifié avec succès',
      document
    });
  } catch (error) {
    console.error('Erreur lors de la modification du document:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la modification du document'
    });
  }
});

// @route   DELETE /api/documents/:documentId
// @desc    Supprimer un document
// @access  Authentifié (propriétaire uniquement)
router.delete('/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const user = req.user;

    const document = await Document.findByPk(documentId);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouvé'
      });
    }

    // Vérifier que l'utilisateur est le propriétaire
    if (document.uploadedBy !== user.numeroH) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Vous n\'êtes pas le propriétaire de ce document.'
      });
    }

    await document.destroy();

    res.json({
      success: true,
      message: 'Document supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du document:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la suppression du document'
    });
  }
});

// ========== PERMISSIONS ==========

// @route   GET /api/documents/permissions
// @desc    Récupérer les permissions accordées
// @access  Authentifié (Admin uniquement)
router.get('/permissions', async (req, res) => {
  try {
    const user = req.user;

    // Vérifier que l'utilisateur est admin
    if (user.role !== 'admin' && user.role !== 'super-admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Admin requis.'
      });
    }

    const permissions = await DocumentPermission.findAll({
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      permissions
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des permissions'
    });
  }
});

// @route   POST /api/documents/grant-permission
// @desc    Accorder une permission à un utilisateur (Admin uniquement)
// @access  Authentifié + Admin
router.post('/grant-permission', async (req, res) => {
  try {
    const { numeroH, permissions, documentTypes, expiresAt, notes, role } = req.body;
    const user = req.user;

    // Vérifier que l'utilisateur est admin
    if (user.role !== 'admin' && user.role !== 'super-admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Admin requis.'
      });
    }

    if (!numeroH) {
      return res.status(400).json({
        success: false,
        message: 'NumeroH est requis'
      });
    }

    // Normaliser permissions (peut être string ou array)
    const permissionType = Array.isArray(permissions) 
      ? (permissions.includes('all') ? 'all' : permissions[0] || 'all')
      : (permissions || 'all');

    // Normaliser documentTypes (peut être string, array ou null)
    const docTypes = documentTypes 
      ? (Array.isArray(documentTypes) ? documentTypes : [documentTypes])
      : [];

    // Créer une permission pour chaque type de document ou une permission globale
    const permissionsToCreate = docTypes.length > 0
      ? docTypes.map(docType => ({
          numeroH,
          documentType: docType,
          permissionType: permissionType,
          role: role || 'state_agent',
          isActive: true,
          grantedBy: user.numeroH,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          notes: notes || null
        }))
      : [{
          numeroH,
          documentType: null, // null = tous les types
          permissionType: permissionType,
          role: role || 'state_agent',
          isActive: true,
          grantedBy: user.numeroH,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          notes: notes || null
        }];

    const createdPermissions = await DocumentPermission.bulkCreate(permissionsToCreate);

    res.status(201).json({
      success: true,
      message: 'Permission(s) accordée(s) avec succès',
      permissions: createdPermissions
    });
  } catch (error) {
    console.error('Erreur lors de l\'octroi de permission:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'octroi de permission',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/documents/permissions/:permissionId
// @desc    Modifier une permission
// @access  Authentifié + Admin
router.put('/permissions/:permissionId', async (req, res) => {
  try {
    const { permissionId } = req.params;
    const { permissions, documentTypes, isActive, expiresAt, notes } = req.body;
    const user = req.user;

    // Vérifier que l'utilisateur est admin
    if (user.role !== 'admin' && user.role !== 'super-admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Admin requis.'
      });
    }

    const permission = await DocumentPermission.findByPk(permissionId);

    if (!permission) {
      return res.status(404).json({
        success: false,
        message: 'Permission non trouvée'
      });
    }

    if (permissions) {
      const permType = Array.isArray(permissions) 
        ? (permissions.includes('all') ? 'all' : permissions[0] || permission.permissionType)
        : permissions;
      permission.permissionType = permType;
    }
    if (documentTypes !== undefined) {
      const docTypes = Array.isArray(documentTypes) ? documentTypes : [documentTypes];
      permission.documentType = docTypes.length > 0 ? docTypes[0] : null;
    }
    if (isActive !== undefined) permission.isActive = isActive;
    if (expiresAt !== undefined) permission.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (notes !== undefined) permission.notes = notes;
    
    await permission.save();

    res.json({
      success: true,
      message: 'Permission modifiée avec succès',
      permission
    });
  } catch (error) {
    console.error('Erreur lors de la modification de la permission:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la modification de la permission'
    });
  }
});

// @route   DELETE /api/documents/permissions/:permissionId
// @desc    Révoker une permission
// @access  Authentifié + Admin
router.delete('/permissions/:permissionId', async (req, res) => {
  try {
    const { permissionId } = req.params;
    const user = req.user;

    // Vérifier que l'utilisateur est admin
    if (user.role !== 'admin' && user.role !== 'super-admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Admin requis.'
      });
    }

    const permission = await DocumentPermission.findByPk(permissionId);

    if (!permission) {
      return res.status(404).json({
        success: false,
        message: 'Permission non trouvée'
      });
    }

    await permission.destroy();

    res.json({
      success: true,
      message: 'Permission révoquée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la révocation de la permission:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la révocation de la permission'
    });
  }
});

// ========== WORKFLOW ÉTAT-CITOYEN ==========
// IMPORTANT: Les routes /state/* doivent être AVANT /:documentId pour éviter les conflits

// Fonction helper pour vérifier si un utilisateur est agent de l'État
async function isStateAgent(numeroH) {
  const permission = await DocumentPermission.findOne({
    where: {
      numeroH,
      isActive: true,
      [Op.or]: [
        { expiresAt: null },
        { expiresAt: { [Op.gt]: new Date() } }
      ]
    }
  });
  return permission !== null;
}

// Fonction helper pour vérifier les permissions d'un agent
async function checkAgentPermission(numeroH, action, documentType = null) {
  const whereClause = {
    numeroH,
    isActive: true,
    [Op.or]: [
      { expiresAt: null },
      { expiresAt: { [Op.gt]: new Date() } }
    ]
  };

  // Rechercher les permissions (globale ou spécifique au type)
  const permissions = await DocumentPermission.findAll({
    where: {
      ...whereClause,
      [Op.or]: documentType 
        ? [
            { documentType: null }, // Permission globale
            { documentType } // Permission spécifique
          ]
        : [
            { documentType: null } // Permission globale uniquement
          ]
    }
  });
  
  if (permissions.length === 0) return false;
  
  // Vérifier si au moins une permission autorise l'action
  for (const permission of permissions) {
    if (permission.permissionType === 'all') return true;
    if (action === 'send' && (permission.permissionType === 'send' || permission.permissionType === 'both')) return true;
    if (action === 'modify' && (permission.permissionType === 'modify' || permission.permissionType === 'all')) return true;
  }
  
  return false;
}

// @route   GET /api/documents/state/errors
// @desc    Récupérer les documents avec erreurs signalées (Agents de l'État)
// @access  Authentifié + Agent de l'État
router.get('/state/errors', async (req, res) => {
  try {
    const user = req.user;

    // Vérifier que l'utilisateur est agent de l'État
    const hasPermission = await isStateAgent(user.numeroH);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Agent de l\'État requis.'
      });
    }

    const documents = await Document.findAll({
      where: {
        sentByState: true,
        userValidationStatus: 'error_reported'
      },
      order: [['errorReportedAt', 'DESC']]
    });

    res.json({
      success: true,
      documents
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des documents avec erreurs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des documents'
    });
  }
});

// @route   POST /api/documents/state/send
// @desc    Envoyer un document à un utilisateur (Agent de l'État uniquement)
// @access  Authentifié + Agent de l'État
router.post('/state/send', upload.single('file'), async (req, res) => {
  try {
    const { recipientNumeroH, title, type, description, category } = req.body;
    const user = req.user;

    // Vérifier que l'utilisateur est agent de l'État
    const hasPermission = await checkAgentPermission(user.numeroH, 'send', type);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Vous devez être agent de l\'État avec permission d\'envoyer des documents.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier fourni'
      });
    }

    if (!recipientNumeroH) {
      return res.status(400).json({
        success: false,
        message: 'NumeroH du destinataire requis'
      });
    }

    const fileUrl = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype, 'documents');
    uploadToIDrive(req.file.buffer, req.file.originalname, req.file.mimetype, 'documents').catch(() => {});

    const document = await Document.create({
      title,
      type,
      description,
      category: category || 'administrative',
      fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      uploadedBy: user.numeroH,
      recipient: recipientNumeroH,
      isPublic: false,
      status: 'approved',
      sentByState: true,
      stateAgentNumeroH: user.numeroH,
      userValidationStatus: 'pending'
    });

    // Créer une entrée de validation
    await DocumentValidation.create({
      documentId: document.id,
      action: 'resubmitted',
      performedBy: user.numeroH,
      notes: 'Document envoyé par un agent de l\'État'
    });

    res.status(201).json({
      success: true,
      message: 'Document envoyé avec succès à l\'utilisateur',
      document
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi du document:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'envoi du document'
    });
  }
});

// @route   PUT /api/documents/state/:documentId
// @desc    Modifier un document (Agent de l'État uniquement)
// @access  Authentifié + Agent de l'État
router.put('/state/:documentId', upload.single('file'), async (req, res) => {
  try {
    const { documentId } = req.params;
    const { title, description, correctionNotes } = req.body;
    const user = req.user;

    const document = await Document.findByPk(documentId);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouvé'
      });
    }

    // Vérifier que le document a été envoyé par l'État
    if (!document.sentByState) {
      return res.status(403).json({
        success: false,
        message: 'Ce document n\'a pas été envoyé par l\'État'
      });
    }

    // Vérifier les permissions
    const hasPermission = await checkAgentPermission(user.numeroH, 'modify', document.type);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Vous n\'avez pas la permission de modifier ce type de document.'
      });
    }

    // Créer une nouvelle version du document
    const previousVersionId = document.id;
    const newVersion = document.version + 1;

    // Si un nouveau fichier est fourni, créer un nouveau document
    if (req.file) {
      const fileUrl = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype, 'documents');
      uploadToIDrive(req.file.buffer, req.file.originalname, req.file.mimetype, 'documents').catch(() => {});

      const newDocument = await Document.create({
        title: title || document.title,
        type: document.type,
        description: description || document.description,
        category: document.category,
        fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        uploadedBy: document.uploadedBy,
        recipient: document.recipient,
        isPublic: document.isPublic,
        status: 'approved',
        sentByState: true,
        stateAgentNumeroH: user.numeroH,
        userValidationStatus: 'pending',
        errorReport: null,
        errorReportedAt: null,
        correctionNotes: correctionNotes || null,
        correctedAt: new Date(),
        version: newVersion,
        previousVersionId
      });

      // Mettre à jour l'ancien document
      document.userValidationStatus = 'corrected';
      await document.save();

      // Créer une entrée de validation
      await DocumentValidation.create({
        documentId: newDocument.id,
        action: 'corrected',
        performedBy: user.numeroH,
        notes: correctionNotes || 'Document corrigé et renvoyé'
      });

      res.json({
        success: true,
        message: 'Document corrigé et renvoyé avec succès',
        document: newDocument
      });
    } else {
      // Mise à jour sans nouveau fichier
      if (title) document.title = title;
      if (description) document.description = description;
      if (correctionNotes) {
        document.correctionNotes = correctionNotes;
        document.correctedAt = new Date();
        document.userValidationStatus = 'corrected';
      }
      await document.save();

      // Créer une entrée de validation
      await DocumentValidation.create({
        documentId: document.id,
        action: 'corrected',
        performedBy: user.numeroH,
        notes: correctionNotes || 'Document modifié'
      });

      res.json({
        success: true,
        message: 'Document modifié avec succès',
        document
      });
    }
  } catch (error) {
    console.error('Erreur lors de la modification du document:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la modification du document'
    });
  }
});

// IMPORTANT: Cette route doit être AVANT /:documentId pour éviter les conflits
// @route   POST /api/documents/:documentId/validate
// @desc    Valider un document (confirmer ou signaler une erreur)
// @access  Authentifié (propriétaire du document)
router.post('/:documentId/validate', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { action, errorReport } = req.body; // action: 'confirm' ou 'report_error'
    const user = req.user;

    const document = await Document.findByPk(documentId);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouvé'
      });
    }

    // Vérifier que l'utilisateur est le destinataire
    if (document.recipient !== user.numeroH) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Vous n\'êtes pas le destinataire de ce document.'
      });
    }

    if (action === 'confirm') {
      document.userValidationStatus = 'confirmed';
      document.errorReport = null;
      document.errorReportedAt = null;

      await DocumentValidation.create({
        documentId: document.id,
        action: 'confirmed',
        performedBy: user.numeroH,
        notes: 'Document confirmé par l\'utilisateur'
      });
    } else if (action === 'report_error') {
      if (!errorReport) {
        return res.status(400).json({
          success: false,
          message: 'Veuillez décrire les erreurs trouvées'
        });
      }

      document.userValidationStatus = 'error_reported';
      document.errorReport = errorReport;
      document.errorReportedAt = new Date();

      await DocumentValidation.create({
        documentId: document.id,
        action: 'error_reported',
        performedBy: user.numeroH,
        notes: errorReport,
        errorDetails: { reportedBy: user.numeroH, reportedAt: new Date() }
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Action invalide. Utilisez "confirm" ou "report_error"'
      });
    }

    await document.save();

    res.json({
      success: true,
      message: action === 'confirm' 
        ? 'Document confirmé avec succès' 
        : 'Erreur signalée avec succès',
      document
    });
  } catch (error) {
    console.error('Erreur lors de la validation du document:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la validation du document'
    });
  }
});

// @route   GET /api/documents/:documentId/validations
// @desc    Récupérer l'historique des validations d'un document
// @access  Authentifié
router.get('/:documentId/validations', async (req, res) => {
  try {
    const { documentId } = req.params;
    const user = req.user;

    const document = await Document.findByPk(documentId);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouvé'
      });
    }

    // Vérifier que l'utilisateur a accès au document
    if (document.recipient !== user.numeroH && 
        document.uploadedBy !== user.numeroH && 
        !document.isPublic &&
        !(await isStateAgent(user.numeroH))) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé'
      });
    }

    const validations = await DocumentValidation.getDocumentValidations(documentId);

    res.json({
      success: true,
      validations
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des validations:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des validations'
    });
  }
});

export default router;


