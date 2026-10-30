import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../types';

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

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB strict limit (Gotcha 2)

// Disk storage engine: writes directly to local ./uploads directory
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const userId = authReq.user?.id || 'common';
    const destDir = path.join(process.cwd(), 'uploads', 'documents', userId);

    try {
      fs.mkdirSync(destDir, { recursive: true });
      cb(null, destDir);
    } catch (err: any) {
      cb(err, destDir);
    }
  },
  filename: (_req, file, cb) => {
    const ext = file.originalname.split('.').pop()?.toLowerCase() ?? 'bin';
    const safeName = file.originalname
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .slice(0, 50);
    const randomHash = crypto.randomBytes(6).toString('hex');
    cb(null, `${Date.now()}-${safeName}-${randomHash}.${ext}`);
  },
});

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Unsupported file type "${file.mimetype}". Allowed: PDF, DOCX, PNG, JPG, WEBP, TIFF.`
        )
      );
    }
  },
});

