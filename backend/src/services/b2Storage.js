import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import path from 'path';

const B2_KEY_ID = process.env.B2_KEY_ID;
const B2_APPLICATION_KEY = process.env.B2_APPLICATION_KEY;
const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME || 'sauvegarde mobile';
const B2_ENDPOINT = process.env.B2_ENDPOINT || 'https://s3.us-east-005.backblazeb2.com';

const b2Client = new S3Client({
  region: 'us-east-005',
  endpoint: B2_ENDPOINT,
  credentials: {
    accessKeyId: B2_KEY_ID,
    secretAccessKey: B2_APPLICATION_KEY,
  },
});

export async function uploadToB2(fileBuffer, originalName, mimeType, folder = 'backup') {
  const ext = path.extname(originalName) || '.bin';
  const key = `${folder}/${randomUUID()}${ext}`;

  await b2Client.send(new PutObjectCommand({
    Bucket: B2_BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
  }));

  // B2 privé → retourner une URL signée valide 7 jours
  const command = new GetObjectCommand({ Bucket: B2_BUCKET_NAME, Key: key });
  const signedUrl = await getSignedUrl(b2Client, command, { expiresIn: 604800 });
  return { key, signedUrl };
}

export { b2Client, B2_BUCKET_NAME };
