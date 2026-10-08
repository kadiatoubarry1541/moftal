import fs from 'fs/promises';
import { uploadToImageKit } from './imagekitStorage.js';
import { uploadToR2 } from './r2Storage.js';
import { uploadToIDrive } from './idriveStorage.js';

// Sur Render, le disque du serveur est effacé à chaque mise en ligne : un
// fichier gardé dans /uploads disparaît (photo de profil vide). On l'envoie donc
// au stockage en ligne (ImageKit pour les images, R2 pour le reste), comme Inspir.
const enProduction = () => process.env.NODE_ENV === 'production' || !!process.env.RENDER;

/**
 * Fichier reçu par multer (stockage disque) → URL durable.
 * En production, un échec d'envoi est une vraie erreur (jamais de faux succès
 * avec un fichier qui disparaîtra) ; en local, on garde /uploads.
 */
export async function urlDurable(file, dossier) {
  try {
    const buffer = file.buffer || await fs.readFile(file.path);
    const url = file.mimetype.startsWith('image/')
      ? await uploadToImageKit(buffer, file.originalname, dossier)
      : await uploadToR2(buffer, file.originalname, file.mimetype, dossier);
    uploadToIDrive(buffer, file.originalname, file.mimetype, dossier).catch(() => {});
    if (file.path) fs.unlink(file.path).catch(() => {});
    return url;
  } catch (e) {
    if (enProduction()) {
      console.error(`Stockage en ligne indisponible (${dossier}):`, e.message);
      throw new Error("Le fichier n'a pas pu être enregistré. Réessayez dans un instant.");
    }
    return `/uploads/${file.filename}`;
  }
}
