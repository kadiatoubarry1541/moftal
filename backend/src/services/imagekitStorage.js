import ImageKit from 'imagekit';
import { randomUUID } from 'crypto';
import path from 'path';

// Construit le client au premier appel seulement — si les identifiants manquent
// sur le serveur, seul l'upload échoue, pas le démarrage de tout le serveur.
let imagekit = null;
function getClient() {
  if (!imagekit) {
    imagekit = new ImageKit({
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
    });
  }
  return imagekit;
}

export async function uploadToImageKit(fileBuffer, originalName, folder = 'photos') {
  const ext = path.extname(originalName) || '.jpg';
  const fileName = `${randomUUID()}${ext}`;

  const result = await getClient().upload({
    file: fileBuffer,
    fileName,
    folder: `/moftal/${folder}`,
    useUniqueFileName: false,
  });

  return result.url;
}

export async function deleteFromImageKit(fileId) {
  try {
    await getClient().deleteFile(fileId);
  } catch (e) {
    console.warn('ImageKit delete warning:', e.message);
  }
}
