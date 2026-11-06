import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// S'assurer que le dossier uploads existe
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Dossier uploads créé:', uploadsDir);
}

// Configuration du stockage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Générer un nom de fichier unique
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Filtre des types de fichiers autorisés
const fileFilter = (req, file, cb) => {
  // Extension exacte obligatoire (avant, « .html » passait si le type annoncé
  // était une image, et une extension contenant « jpg » quelque part suffisait)
  const allowedExtensions = /^\.(jpeg|jpg|png|gif|webp|mp4|avi|mov|wav|mp3|pdf|doc|docx)$/;
  const allowedMimes = /image\/(jpeg|jpg|png|gif|webp)|video\/(mp4|avi|quicktime|x-msvideo)|audio\/(wav|mpeg|mp3)|application\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document)/;

  const ext = path.extname(file.originalname || '').toLowerCase();
  // Sans extension (photo envoyée par le navigateur : « blob ») : le type décide
  const extname = ext ? allowedExtensions.test(ext) : true;
  const mimetype = allowedMimes.test(file.mimetype);

  // Le type annoncé peut manquer sur certains téléphones : l'extension décide,
  // mais un type annoncé qui n'est pas autorisé est refusé
  const typeVide = !file.mimetype || file.mimetype === 'application/octet-stream';
  if (extname && (mimetype || (typeVide && ext))) {
    return cb(null, true);
  } else {
    cb(new Error('Type de fichier non autorisé. Types acceptés: images (jpg, png, gif, webp), vidéos, audio, documents PDF/Word'));
  }
};

// Configuration de multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB par défaut
    files: 5 // Maximum 5 fichiers par requête
  },
  fileFilter: fileFilter
});

// Middleware pour gérer les erreurs d'upload
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Fichier trop volumineux. Taille maximale: 10MB'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Trop de fichiers. Maximum: 5 fichiers par requête'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Champ de fichier inattendu'
      });
    }
  }
  
  if (err.message.includes('Type de fichier non autorisé')) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  next(err);
};

// Middleware d'upload pour les images
export const uploadImage = upload.single('image');

// Middleware d'upload pour les vidéos
export const uploadVideo = upload.single('video');

// Middleware d'upload pour les fichiers audio
export const uploadAudio = upload.single('audio');

// Middleware d'upload pour les documents
export const uploadDocument = upload.single('document');

// Middleware d'upload multiple
export const uploadMultiple = upload.array('files', 5);

// Middleware d'upload pour les profils utilisateur
export const uploadProfile = upload.single('profilePhoto');

export default upload;
