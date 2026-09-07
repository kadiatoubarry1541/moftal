import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import QuartierDocument from '../models/QuartierDocument.js';
import { uploadToR2, deleteFromR2 } from '../services/r2Storage.js';
import { uploadToIDrive } from '../services/idriveStorage.js';

// "Livre" du quartier / sous-préfecture : documents (PDF...) sur l'histoire
// et la vie du lieu — consultable par tous, publié par les admins/journalistes.

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

const isJournalistOrAdmin = (user) =>
  user.isMasterAdmin ||
  user.role === 'admin' ||
  user.role === 'super-admin' ||
  user.role === 'journalist' ||
  user.isJournalist === true;

// GET /api/quartier-documents?scope=&location=
router.get('/', async (req, res) => {
  try {
    const { scope, location } = req.query;
    if (!scope || !location) {
      return res.status(400).json({ success: false, message: 'scope et location requis.' });
    }
    const documents = await QuartierDocument.findAll({
      where: { scope, location: String(location).toLowerCase() },
      order: [['created_at', 'DESC']]
    });
    res.json({ success: true, documents });
  } catch (err) {
    console.error('quartier-documents GET:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// POST /api/quartier-documents — admin/journaliste uniquement
router.post('/', upload.single('document'), async (req, res) => {
  try {
    if (!isJournalistOrAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Réservé aux administrateurs/journalistes.' });
    }
    const { scope, location, locationName, titre, description } = req.body;
    if (!scope || !location || !titre?.trim()) {
      return res.status(400).json({ success: false, message: 'scope, location et titre requis.' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Fichier requis.' });
    }
    const fileUrl = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype, 'quartier-documents');
    uploadToIDrive(req.file.buffer, req.file.originalname, req.file.mimetype, 'quartier-documents').catch(() => {});
    const doc = await QuartierDocument.create({
      scope,
      location: String(location).toLowerCase(),
      locationName: locationName || location,
      titre: titre.trim(),
      description: description?.trim() || null,
      fileUrl,
      fileName: req.file.originalname,
      uploadedByNumeroH: req.user.numeroH,
      uploadedByNom: `${req.user.prenom || ''} ${req.user.nomFamille || ''}`.trim() || req.user.numeroH
    });
    res.json({ success: true, document: doc });
  } catch (err) {
    console.error('quartier-documents POST:', err);
    res.status(500).json({ success: false, message: err.message || 'Erreur serveur.' });
  }
});

// DELETE /api/quartier-documents/:id — admin ou celui qui l'a publié
router.delete('/:id', async (req, res) => {
  try {
    const doc = await QuartierDocument.findByPk(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Document introuvable.' });
    if (!isJournalistOrAdmin(req.user) && doc.uploadedByNumeroH !== req.user.numeroH) {
      return res.status(403).json({ success: false, message: 'Non autorisé.' });
    }
    await deleteFromR2(doc.fileUrl);
    await doc.destroy();
    res.json({ success: true });
  } catch (err) {
    console.error('quartier-documents DELETE:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

export default router;
