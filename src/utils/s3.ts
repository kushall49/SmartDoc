import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import s3Client, { AWS_CONFIG } from '@/lib/aws';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

/**
 * Generate a unique S3 key for a file
 */
export function generateS3Key(userId: string, originalFilename: string): string {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  const extension = originalFilename.split('.').pop();
  return `documents/${userId}/${timestamp}-${randomString}.${extension}`;
}

/**
 * Upload a file to S3
 */
export async function uploadToS3(
  file: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  try {
    const command = new PutObjectCommand({
      Bucket: AWS_CONFIG.bucketName,
      Key: key,
      Body: file,
      ContentType: contentType,
    });

    await s3Client.send(command);

    const url = `https://${AWS_CONFIG.bucketName}.s3.${AWS_CONFIG.region}.amazonaws.com/${key}`;
    
    logger.info('File uploaded to S3', { key, url });
    
    return url;
  } catch (error) {
    logger.error('Failed to upload file to S3', error as Error, { key });
    throw new Error('Failed to upload file to S3');
  }
}

/**
 * Get a presigned URL for downloading a file from S3
 */
export async function getPresignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: AWS_CONFIG.bucketName,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    
    logger.debug('Generated presigned download URL', { key, expiresIn });
    
    return url;
  } catch (error) {
    logger.error('Failed to generate presigned URL', error as Error, { key });
    throw new Error('Failed to generate download URL');
  }
}

/**
 * Download a file from S3
 */
export async function downloadFromS3(key: string): Promise<Buffer> {
  try {
    const command = new GetObjectCommand({
      Bucket: AWS_CONFIG.bucketName,
      Key: key,
    });

    const response = await s3Client.send(command);
    
    if (!response.Body) {
      throw new Error('Empty response body');
    }

    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);
    
    logger.debug('File downloaded from S3', { key, size: buffer.length });
    
    return buffer;
  } catch (error) {
    logger.error('Failed to download file from S3', error as Error, { key });
    throw new Error('Failed to download file from S3');
  }
}

/**
 * Delete a file from S3
 */
export async function deleteFromS3(key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: AWS_CONFIG.bucketName,
      Key: key,
    });

    await s3Client.send(command);
    
    logger.info('File deleted from S3', { key });
  } catch (error) {
    logger.error('Failed to delete file from S3', error as Error, { key });
    throw new Error('Failed to delete file from S3');
  }
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * Get content type from file extension
 */
export function getContentType(extension: string): string {
  const contentTypes: Record<string, string> = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc: 'application/msword',
    txt: 'text/plain',
  };

  return contentTypes[extension] || 'application/octet-stream';
}
