import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import path from 'path';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '14b494a4862d6fbb64afcb23911a7817';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'moftal-storage';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || `https://files.moftal.com`;

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export async function uploadToR2(fileBuffer, originalName, mimeType, folder = 'files') {
  const ext = path.extname(originalName) || '.bin';
  const key = `${folder}/${randomUUID()}${ext}`;

  await r2Client.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
  }));

  return `${R2_PUBLIC_URL}/${key}`;
}

export async function deleteFromR2(fileUrl) {
  try {
    const key = fileUrl.replace(`${R2_PUBLIC_URL}/`, '');
    await r2Client.send(new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    }));
  } catch (e) {
    console.warn('R2 delete warning:', e.message);
  }
}

export { r2Client, R2_BUCKET_NAME };
