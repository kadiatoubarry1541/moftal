import express from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { uploadToR2 } from '../services/r2Storage.js';
import { uploadToImageKit } from '../services/imagekitStorage.js';
import { uploadToIDrive } from '../services/idriveStorage.js';
import { authenticate as verifyToken } from '../middleware/auth.js';

const router = express.Router();

const memStorage = multer.memoryStorage();
const upload = multer({
  storage: memStorage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB max (vidéos inscription)
  fileFilter: (req, file, cb) => {
    const allowed = /image\/(jpeg|jpg|png|gif|webp)|video\/(mp4|quicktime|x-msvideo|avi)|audio\/(wav|mpeg|mp3)|application\/(pdf|msword)/;
    if (allowed.test(file.mimetype)) return cb(null, true);
    cb(new Error('Type de fichier non autorisé'));
  },
});

// Rate limit pour les uploads publics (inscription) : 50 uploads/IP/heure
const registerUploadLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: { success: false, message: 'Trop de tentatives, réessayez dans 1 heure' },
});

async function handleUpload(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Aucun fichier reçu' });
    }
    const { mimetype, buffer, originalname } = req.file;
    const folder = req.body.folder || detectFolder(mimetype);
    let url;
    if (mimetype.startsWith('image/')) {
      url = await uploadToImageKit(buffer, originalname, folder);
      // backup sur IDrive e2
      uploadToIDrive(buffer, originalname, mimetype, folder).catch(() => {});
    } else {
      url = await uploadToR2(buffer, originalname, mimetype, folder);
      // backup sur IDrive e2
      uploadToIDrive(buffer, originalname, mimetype, folder).catch(() => {});
    }
    res.json({ success: true, url });
  } catch (err) {
    console.error('Upload error:', err.message);
    res.status(500).json({ success: false, message: 'Erreur upload: ' + err.message });
  }
}

// POST /api/upload — upload pour utilisateurs connectés
router.post('/', verifyToken, upload.single('file'), handleUpload);

// POST /api/upload/register — upload pour inscription (sans token, limité)
router.post('/register', registerUploadLimit, upload.single('file'), handleUpload);

function detectFolder(mimetype) {
  if (mimetype.startsWith('image/')) return 'photos';
  if (mimetype.startsWith('video/')) return 'videos';
  if (mimetype.startsWith('audio/')) return 'audio';
  return 'documents';
}

export default router;
