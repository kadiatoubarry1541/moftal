import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import ResidenceProof from '../models/ResidenceProof.js';
import ResidenceGroup from '../models/ResidenceGroup.js';
import { uploadToR2, deleteFromR2 } from '../services/r2Storage.js';
import { uploadToIDrive } from '../services/idriveStorage.js';

// Papiers de résidence : chaque membre téléverse un justificatif prouvant qu'il
// habite bien le quartier déclaré. L'admin du quartier (ResidenceGroup.admin)
// peut les consulter depuis la liste des membres pour vérifier l'appartenance réelle.

const router = express.Router();
router.use(authenticate);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les PDF et images sont autorisés'), false);
    }
  }
});

function isPlatformAdmin(user) {
  return !!(user && (user.role === 'admin' || user.role === 'super-admin' || user.isMasterAdmin || user.canViewAll));
}

function canViewMember(user, group, numeroH) {
  return user.numeroH === numeroH || isPlatformAdmin(user) || (group && group.admin === user.numeroH);
}

// GET /api/residence-proofs/mine?groupId= — mes propres justificatifs pour un quartier
router.get('/mine', async (req, res) => {
  try {
    const { groupId } = req.query;
    if (!groupId) return res.status(400).json({ success: false, message: 'groupId requis.' });
    const proofs = await ResidenceProof.findAll({
      where: { groupId, numeroH: req.user.numeroH },
      order: [['created_at', 'DESC']]
    });
    res.json({ success: true, proofs });
  } catch (err) {
    console.error('residence-proofs GET mine:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// GET /api/residence-proofs/member/:numeroH?groupId= — voir les justificatifs d'un
// membre (soi-même, ou l'admin du quartier concerné)
router.get('/member/:numeroH', async (req, res) => {
  try {
    const { groupId } = req.query;
    if (!groupId) return res.status(400).json({ success: false, message: 'groupId requis.' });
    const group = await ResidenceGroup.findByPk(groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Groupe introuvable.' });
    if (!canViewMember(req.user, group, req.params.numeroH)) {
      return res.status(403).json({ success: false, message: 'Non autorisé.' });
    }
    const proofs = await ResidenceProof.findAll({
      where: { groupId, numeroH: req.params.numeroH },
      order: [['created_at', 'DESC']]
    });
    res.json({ success: true, proofs });
  } catch (err) {
    console.error('residence-proofs GET member:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// POST /api/residence-proofs — un membre téléverse son propre justificatif
router.post('/', upload.single('document'), async (req, res) => {
  try {
    const { groupId } = req.body;
    if (!groupId) return res.status(400).json({ success: false, message: 'groupId requis.' });
    if (!req.file) return res.status(400).json({ success: false, message: 'Fichier requis.' });
    const group = await ResidenceGroup.findByPk(groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Groupe introuvable.' });

    const fileUrl = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype, 'residence-proofs');
    uploadToIDrive(req.file.buffer, req.file.originalname, req.file.mimetype, 'residence-proofs').catch(() => {});

    const proof = await ResidenceProof.create({
      groupId,
      numeroH: req.user.numeroH,
      fileUrl,
      fileName: req.file.originalname
    });
    res.json({ success: true, proof });
  } catch (err) {
    console.error('residence-proofs POST:', err);
    res.status(500).json({ success: false, message: err.message || 'Erreur serveur.' });
  }
});

// DELETE /api/residence-proofs/:id — soi-même ou un admin plateforme
router.delete('/:id', async (req, res) => {
  try {
    const proof = await ResidenceProof.findByPk(req.params.id);
    if (!proof) return res.status(404).json({ success: false, message: 'Justificatif introuvable.' });
    if (proof.numeroH !== req.user.numeroH && !isPlatformAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Non autorisé.' });
    }
    await deleteFromR2(proof.fileUrl);
    await proof.destroy();
    res.json({ success: true });
  } catch (err) {
    console.error('residence-proofs DELETE:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

export default router;
