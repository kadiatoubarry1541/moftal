import ImageKit from 'imagekit';
import { randomUUID } from 'crypto';
import path from 'path';

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || 'public_o6m1CeyUMMXTp1v9SGoSn5p3kps=',
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || 'private_A3TzY4UtQseNZgvy5MHhwyoWd9A=',
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/zislz2y2j',
});

export async function uploadToImageKit(fileBuffer, originalName, folder = 'photos') {
  const ext = path.extname(originalName) || '.jpg';
  const fileName = `${randomUUID()}${ext}`;

  const result = await imagekit.upload({
    file: fileBuffer,
    fileName,
    folder: `/moftal/${folder}`,
    useUniqueFileName: false,
  });

  return result.url;
}

export async function deleteFromImageKit(fileId) {
  try {
    await imagekit.deleteFile(fileId);
  } catch (e) {
    console.warn('ImageKit delete warning:', e.message);
  }
}

export { imagekit };
