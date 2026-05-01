import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from '@/lib/logger';

function getS3Client() {
  return new S3Client({
    region: process.env.AWS_REGION ?? 'us-east-1',
    credentials:
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          }
        : undefined,
  });
}

const BUCKET = process.env.AWS_S3_BUCKET_NAME ?? 'smartdociq-documents';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/tiff',
]);

export function validateFile(
  file: File | { name: string; type: string; size: number }
): string | null {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return `File type "${file.type}" is not supported. Use PDF, DOCX, or image files.`;
  }
  const maxBytes =
    parseInt(process.env.MAX_FILE_SIZE_MB ?? '10') * 1024 * 1024;
  if (file.size > maxBytes) {
    return `File exceeds the maximum size of ${process.env.MAX_FILE_SIZE_MB ?? '10'}MB.`;
  }
  return null;
}

export async function uploadToS3(
  key: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  logger.info('Uploading to S3', { key, mimeType, bytes: buffer.length });
  const s3 = getS3Client();
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  );
  return `https://${BUCKET}.s3.${process.env.AWS_REGION ?? 'us-east-1'}.amazonaws.com/${key}`;
}

export async function getPresignedDownloadUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  const s3 = getS3Client();
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn }
  );
}

export async function deleteFromS3(key: string): Promise<void> {
  const s3 = getS3Client();
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  logger.info('Deleted from S3', { key });
}

export async function getS3Buffer(key: string): Promise<Buffer> {
  const s3 = getS3Client();
  const response = await s3.send(
    new GetObjectCommand({ Bucket: BUCKET, Key: key })
  );
  if (!response.Body) throw new Error('Empty S3 response body');
  const bytes = await response.Body.transformToByteArray();
  return Buffer.from(bytes);
}

/**
 * Local filesystem fallback for development without AWS.
 * Saves files to <cwd>/uploads/<key>
 */
export async function saveLocally(
  key: string,
  buffer: Buffer
): Promise<string> {
  const path = await import('path');
  const fs = await import('fs/promises');
  const fullPath = path.join(process.cwd(), 'uploads', key);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, buffer);
  const urlPath = key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `/api/files/${urlPath}`;
}

export async function readLocally(key: string): Promise<Buffer> {
  const path = await import('path');
  const fs = await import('fs/promises');
  const fullPath = path.join(process.cwd(), 'uploads', key);
  return fs.readFile(fullPath);
}

export async function deleteLocally(key: string): Promise<void> {
  const path = await import('path');
  const fs = await import('fs/promises');
  const fullPath = path.join(process.cwd(), 'uploads', key);
  await fs.unlink(fullPath).catch(() => void 0);
}

const USE_AWS =
  !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);

export async function uploadFile(
  key: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  if (USE_AWS) {
    try {
      return await uploadToS3(key, buffer, mimeType);
    } catch (error) {
      logger.warn('S3 upload failed, falling back to local storage', {
        key,
        error: String(error),
      });
    }
  }
  return saveLocally(key, buffer);
}

export async function getFileBuffer(key: string): Promise<Buffer> {
  if (USE_AWS) {
    try {
      return await getS3Buffer(key);
    } catch (error) {
      logger.warn('S3 read failed, attempting local fallback', {
        key,
        error: String(error),
      });
    }
  }
  return readLocally(key);
}

export async function deleteFile(key: string): Promise<void> {
  if (USE_AWS) {
    try {
      await deleteFromS3(key);
      return;
    } catch (error) {
      logger.warn('S3 delete failed, attempting local fallback', {
        key,
        error: String(error),
      });
    }
  }
  return deleteLocally(key);
}
