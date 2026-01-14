import { S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

// Configuración del cliente S3 para Cloudflare R2
export const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export const bucketName = process.env.R2_BUCKET_NAME || 'epauta';
export const publicDomain = process.env.R2_PUBLIC_DOMAIN || '';
