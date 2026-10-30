import { Router, Request, Response } from 'express';
import path from 'path';
import { optionalAuth } from '../middleware/auth.middleware';
import { readFile, fileExists } from '@/services/storage.service';
import { prisma } from '@/lib/db';

const router = Router();

/**
 * GET /api/files/* - Serve uploaded document from local disk
 */
router.get('/*', optionalAuth, async (req: Request, res: Response) => {
  try {
    // The wildcard param in express contains the relative file path
    const rawKey = req.params[0];
    if (!rawKey) {
      res.status(404).json({ success: false, error: 'File path not specified' });
      return;
    }

    const normalizedKey = rawKey.replace(/^uploads\//, '');
    const exists = await fileExists(normalizedKey);

    if (!exists) {
      res.status(404).json({ success: false, error: 'File not found on disk' });
      return;
    }

    // Lookup metadata in PostgreSQL
    const doc = await prisma.document.findFirst({
      where: {
        OR: [
          { filePath: `uploads/${normalizedKey}` },
          { filePath: normalizedKey },
        ],
      },
    });

    const buffer = await readFile(normalizedKey);
    const mimeType = doc?.mimeType || 'application/octet-stream';
    const filename = doc?.originalName || path.basename(normalizedKey);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Cache-Control', 'private, max-age=86400'); // 1 day client cache
    res.send(buffer);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

