import { UPLOAD_CONFIG } from '@/lib/config';
import { ValidationError } from '@/lib/errors';

/**
 * Validate file size
 */
export function validateFileSize(fileSize: number): void {
  if (fileSize > UPLOAD_CONFIG.maxFileSize) {
    throw new ValidationError(
      `File size exceeds maximum allowed size of ${UPLOAD_CONFIG.maxFileSize / (1024 * 1024)}MB`
    );
  }

  if (fileSize === 0) {
    throw new ValidationError('File is empty');
  }
}

/**
 * Validate file type
 */
export function validateFileType(filename: string, mimeType?: string): void {
  const extension = filename.split('.').pop()?.toLowerCase();

  if (!extension) {
    throw new ValidationError('File has no extension');
  }

  if (!UPLOAD_CONFIG.allowedFileTypes.includes(extension)) {
    throw new ValidationError(
      `File type .${extension} is not allowed. Allowed types: ${UPLOAD_CONFIG.allowedFileTypes.join(', ')}`
    );
  }

  if (mimeType && !UPLOAD_CONFIG.allowedMimeTypes.includes(mimeType)) {
    throw new ValidationError(`MIME type ${mimeType} is not allowed`);
  }
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(filename: string): string {
  // Remove any directory path
  const basename = filename.split(/[/\\]/).pop() || filename;
  
  // Replace special characters with underscores
  const sanitized = basename.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  // Limit length
  const maxLength = 255;
  if (sanitized.length > maxLength) {
    const extension = sanitized.split('.').pop();
    const nameWithoutExt = sanitized.substring(0, maxLength - (extension?.length || 0) - 1);
    return `${nameWithoutExt}.${extension}`;
  }
  
  return sanitized;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Get file icon based on extension
 */
export function getFileIcon(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  const icons: Record<string, string> = {
    pdf: '📄',
    png: '🖼️',
    jpg: '🖼️',
    jpeg: '🖼️',
    docx: '📝',
    doc: '📝',
    txt: '📃',
  };

  return icons[extension || ''] || '📎';
}
