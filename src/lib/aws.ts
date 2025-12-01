import { S3Client } from '@aws-sdk/client-s3';

if (!process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.warn('⚠️ AWS credentials not configured. S3 features will be unavailable.');
}

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export const AWS_CONFIG = {
  s3Client,
  bucketName: process.env.AWS_S3_BUCKET_NAME || 'smartdociq-documents',
  region: process.env.AWS_REGION || 'us-east-1',
};

export default s3Client;
