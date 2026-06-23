import { v2 as cloudinary } from 'cloudinary';
import { randomUUID } from 'crypto';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dpqmir1jt',
  api_key: process.env.CLOUDINARY_API_KEY || '697496277423473',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'UUVkxxVnlx6dLvOkZdgp8rU85cQ',
});

export async function uploadToCloudinary(fileBuffer, folder = 'photos', resourceType = 'image') {
  return new Promise((resolve, reject) => {
    const publicId = `moftal/${folder}/${randomUUID()}`;
    const uploadStream = cloudinary.uploader.upload_stream(
      { public_id: publicId, resource_type: resourceType, overwrite: false },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    uploadStream.end(fileBuffer);
  });
}

export async function deleteFromCloudinary(publicId, resourceType = 'image') {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (e) {
    console.warn('Cloudinary delete warning:', e.message);
  }
}

export { cloudinary };
