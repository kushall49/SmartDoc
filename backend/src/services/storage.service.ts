import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { logger } from '@/lib/logger';

// Standard storage directory on local disk
const UPLOADS_ROOT = path.join(process.cwd(), 'uploads');
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB strict limit

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/tiff',
]);

export interface SavedFileInfo {
  filePath: string;      // relative path stored in DB: "uploads/documents/..."
  absolutePath: string;  // absolute disk path
  publicUrl: string;     // local serving URL: "/api/files/..."
  sizeBytes: number;
}

/**
 * Validates uploaded file against size limits (10 MB) and allowed MIME types.
 */
export function validateFile(file: { name: string; type: string; size: number }): string | null {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return `Unsupported file type: "${file.type}". Allowed formats: PDF, DOCX, PNG, JPG, WEBP, TIFF.`;
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File exceeds the 10 MB limit (received ${(file.size / (1024 * 1024)).toFixed(2)} MB).`;
  }
  return null;
}

/**
 * Resolve an input filePath safely within the uploads root to prevent directory traversal.
 */
function resolveSafePath(filePathOrKey: string): string {
  // Normalize forward/backslashes
  const cleanKey = filePathOrKey.replace(/^uploads[\\/]/, '');
  const absolute = path.resolve(UPLOADS_ROOT, cleanKey);

  // Security check: ensure path stays inside UPLOADS_ROOT
  if (!absolute.startsWith(UPLOADS_ROOT)) {
    throw new Error('Access denied: Invalid file path traversal attempt.');
  }

  return absolute;
}

/**
 * Saves a file buffer directly to the local ./uploads directory.
 * No S3, no presigned URLs, no cloud storage branches.
 */
export async function saveFile(
  userId: string,
  originalFilename: string,
  buffer: Buffer
): Promise<SavedFileInfo> {
  const ext = originalFilename.split('.').pop()?.toLowerCase() ?? 'bin';
  const safeBaseName = originalFilename
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .slice(0, 50);

  const randomHash = crypto.randomBytes(6).toString('hex');
  const relativeKey = path.join('documents', userId, `${Date.now()}-${safeBaseName}-${randomHash}.${ext}`);
  const absolutePath = path.join(UPLOADS_ROOT, relativeKey);

  // Ensure target directory exists
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });

  // Write file to disk
  await fs.writeFile(absolutePath, buffer);

  const normalizedRelativePath = path.join('uploads', relativeKey).replace(/\\/g, '/');
  const publicUrl = `/api/files/${relativeKey.replace(/\\/g, '/')}`;

  logger.info('File saved to local storage', {
    userId,
    filePath: normalizedRelativePath,
    sizeBytes: buffer.length,
  });

  return {
    filePath: normalizedRelativePath,
    absolutePath,
    publicUrl,
    sizeBytes: buffer.length,
  };
}

/**
 * Read file buffer from local disk.
 */
export async function readFile(filePathOrKey: string): Promise<Buffer> {
  const absolutePath = resolveSafePath(filePathOrKey);
  return fs.readFile(absolutePath);
}

/**
 * Delete file from local disk.
 */
export async function deleteFile(filePathOrKey: string): Promise<void> {
  try {
    const absolutePath = resolveSafePath(filePathOrKey);
    await fs.unlink(absolutePath);
    logger.info('File deleted from local disk', { filePath: filePathOrKey });
  } catch (err: any) {
    if (err?.code !== 'ENOENT') {
      logger.warn('Error deleting local file', { error: String(err), filePath: filePathOrKey });
    }
  }
}

/**
 * Check if a file exists on local disk.
 */
export async function fileExists(filePathOrKey: string): Promise<boolean> {
  try {
    const absolutePath = resolveSafePath(filePathOrKey);
    await fs.access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

