import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { generateQueryEmbedding } from '@/services/embedding.service';
import { searchSimilarChunks } from '@/services/vector-search.service';
import { prisma } from '@/lib/db';
import { AuthenticatedRequest } from '../types';

const router = Router();
router.use(requireAuth);

/**
 * GET /api/search?q=...&limit=10&type=...&from=...&to=... - Semantic vector search with filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const query = req.query.q as string;
    const limit = Math.min(50, parseInt((req.query.limit as string) || '15'));
    const docTypeFilter = req.query.type as string | undefined;
    const dateFrom = req.query.from ? new Date(req.query.from as string) : undefined;
    const dateTo = req.query.to ? new Date(req.query.to as string) : undefined;

    if (!query || query.trim().length < 2) {
      res.status(400).json({ success: false, error: 'Query must be at least 2 characters.' });
      return;
    }

    const queryEmbedding = await generateQueryEmbedding(query);
    const scoredChunks = await searchSimilarChunks({
      userId: authReq.user.id,
      queryEmbedding,
      limit: limit * 3,
      minSimilarity: 0.20,
    });

    // Lookup metadata for matched documents
    const docIds = Array.from(new Set(scoredChunks.map((c) => c.documentId)));
    const docs = await prisma.document.findMany({
      where: {
        id: { in: docIds },
        userId: authReq.user.id,
        ...(docTypeFilter ? { documentType: { equals: docTypeFilter, mode: 'insensitive' } } : {}),
        ...(dateFrom || dateTo
          ? {
              createdAt: {
                ...(dateFrom ? { gte: dateFrom } : {}),
                ...(dateTo ? { lte: dateTo } : {}),
              },
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        documentType: true,
        createdAt: true,
        keywords: true,
      },
    });

    const docMap = new Map(docs.map((d) => [d.id, d]));

    // Deduplicate to present highest-scoring chunk per document matching filters
    const seen = new Set<string>();
    const topResults = scoredChunks.filter((chunk) => {
      if (!docMap.has(chunk.documentId)) return false;
      if (seen.has(chunk.documentId)) return false;
      seen.add(chunk.documentId);
      return true;
    }).slice(0, limit);

    const results = topResults.map((chunk) => {
      const doc = docMap.get(chunk.documentId);
      return {
        documentId: chunk.documentId,
        documentName: chunk.documentName,
        documentType: doc?.documentType || 'other',
        createdAt: doc?.createdAt,
        keywords: doc?.keywords || [],
        chunkText: chunk.chunkText,
        pageNumber: chunk.pageNumber,
        score: Math.round(chunk.similarity * 100) / 100,
      };
    });

    res.status(200).json({
      success: true,
      query,
      total: results.length,
      filters: {
        type: docTypeFilter || null,
        from: dateFrom ? dateFrom.toISOString() : null,
        to: dateTo ? dateTo.toISOString() : null,
      },
      results,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

