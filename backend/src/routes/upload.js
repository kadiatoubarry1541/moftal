import express from 'express';
import multer from 'multer';
import { uploadToR2 } from '../services/r2Storage.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

const memStorage = multer.memoryStorage();
const upload = multer({
  storage: memStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    const allowed = /image\/(jpeg|jpg|png|gif|webp)|video\/(mp4|quicktime|x-msvideo|avi)|audio\/(wav|mpeg|mp3)|application\/(pdf|msword)/;
    if (allowed.test(file.mimetype)) return cb(null, true);
    cb(new Error('Type de fichier non autorisé'));
  },
});

// POST /api/upload — upload un fichier vers R2
router.post('/', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Aucun fichier reçu' });
    }

    const folder = req.body.folder || detectFolder(req.file.mimetype);
    const url = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype, folder);

    res.json({ success: true, url });
  } catch (err) {
    console.error('Upload R2 error:', err.message);
    res.status(500).json({ success: false, message: 'Erreur upload: ' + err.message });
  }
});

function detectFolder(mimetype) {
  if (mimetype.startsWith('image/')) return 'photos';
  if (mimetype.startsWith('video/')) return 'videos';
  if (mimetype.startsWith('audio/')) return 'audio';
  return 'documents';
}

export default router;
