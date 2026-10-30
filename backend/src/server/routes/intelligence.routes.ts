import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { analyzeAcrossDocuments } from '@/services/intelligence.service';
import { AuthenticatedRequest } from '../types';
import { logger } from '@/lib/logger';

const router = Router();
router.use(requireAuth);

/**
 * POST /api/intelligence - Cross-document intelligence scan
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { query } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      res.status(400).json({ success: false, error: 'Query prompt is required' });
      return;
    }

    const report = await analyzeAcrossDocuments(authReq.user.id, query.trim());

    res.status(200).json({
      success: true,
      report,
    });
  } catch (error: any) {
    logger.error('Cross-document intelligence failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

