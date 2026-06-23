import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const IDRIVE_ENDPOINT = process.env.IDRIVE_ENDPOINT || 'https://s3.eu-west-4.idrivee2.com';
const IDRIVE_REGION = process.env.IDRIVE_REGION || 'eu-west-4';
const IDRIVE_ACCESS_KEY = process.env.IDRIVE_ACCESS_KEY || 'SysNAGvjpqYo2PddzBYN';
const IDRIVE_SECRET_KEY = process.env.IDRIVE_SECRET_KEY || 'S2zrj4fc9rQIKuQE7OlafrwoBBQfrEhmPH4GnYpD';
const IDRIVE_BUCKET = process.env.IDRIVE_BUCKET || 'moftal-backup';

const client = new S3Client({
  endpoint: IDRIVE_ENDPOINT,
  region: IDRIVE_REGION,
  credentials: {
    accessKeyId: IDRIVE_ACCESS_KEY,
    secretAccessKey: IDRIVE_SECRET_KEY,
  },
  forcePathStyle: true,
});

export async function uploadToIDrive(fileBuffer, originalName, mimeType, folder = 'backup') {
  const ext = path.extname(originalName) || '.bin';
  const key = `${folder}/${uuidv4()}${ext}`;

  await client.send(new PutObjectCommand({
    Bucket: IDRIVE_BUCKET,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
    ACL: 'public-read',
  }));

  return `${IDRIVE_ENDPOINT}/${IDRIVE_BUCKET}/${key}`;
}

export async function deleteFromIDrive(fileUrl) {
  try {
    const url = new URL(fileUrl);
    const key = url.pathname.replace(`/${IDRIVE_BUCKET}/`, '');
    await client.send(new DeleteObjectCommand({ Bucket: IDRIVE_BUCKET, Key: key }));
  } catch (e) {
    console.error('IDrive delete error:', e.message);
  }
}
