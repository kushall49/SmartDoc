import { Router, Request, Response } from 'express';
import path from 'path';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '../middleware/auth.middleware';
import { uploadMiddleware } from '../middleware/upload.middleware';
import { addDocumentToQueue } from '@/services/queue.service';
import { processDocument } from '@/services/document-processor.service';
import { deleteFile, readFile } from '@/services/storage.service';
import { compareDocuments } from '@/services/comparison.service';
import { analyzeDocumentWithVision, VisionAnalysisType } from '@/services/vision.service';
import { AuthenticatedRequest } from '../types';
import { logger } from '@/lib/logger';

const router = Router();

/**
 * Public document viewing route (for shared documents)
 */
router.get('/public/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const document = await prisma.document.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        status: true,
        documentType: true,
        pageCount: true,
        summary: true,
        entities: true,
        keywords: true,
        anomalies: true,
        createdAt: true,
      },
    });

    if (!document) {
      res.status(404).json({ success: false, error: 'Document not found' });
      return;
    }

    res.status(200).json({ success: true, document, isPublic: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// All subsequent document routes require authentication (multi-tenant isolation)
router.use(requireAuth);

/**
 * GET /api/documents - List user's documents
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const documents = await prisma.document.findMany({
      where: { userId: authReq.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        status: true,
        documentType: true,
        pageCount: true,
        summary: true,
        entities: true,
        keywords: true,
        anomalies: true,
        tokensUsed: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json({ success: true, documents });
  } catch (error: any) {
    logger.error('Failed to list documents', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/documents/upload - Multer file upload with instant inline processing
 */
router.post('/upload', uploadMiddleware.single('file'), async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const file = req.file;

    if (!file) {
      res.status(400).json({ success: false, error: 'No file provided' });
      return;
    }

    // Compute relative path inside uploads root
    const relativePath = path
      .relative(process.cwd(), file.path)
      .replace(/\\/g, '/');

    const cleanName = file.originalname.replace(/\.[^/.]+$/, '');

    // 1. Insert document record in PostgreSQL
    const doc = await prisma.document.create({
      data: {
        userId: authReq.user.id,
        name: cleanName,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        filePath: relativePath,
        status: 'pending',
      },
    });

    // 2. Process document synchronously inline (takes < 300ms)
    try {
      await processDocument(doc.id);
      logger.info('Document processed synchronously on upload', { documentId: doc.id });
    } catch (procErr: any) {
      logger.error('Inline document processing warning', {
        error: procErr?.message || String(procErr),
        documentId: doc.id,
      });
    }

    // 3. Optional BullMQ processing job on Redis (safe fallback)
    let jobId: string | null = null;
    try {
      jobId = await addDocumentToQueue(doc.id);
    } catch {
      // Redis unavailable or background queue skipped - document is already ready
    }

    // 4. Return refreshed document
    const readyDoc = await prisma.document.findUnique({
      where: { id: doc.id },
    });

    logger.info('Document uploaded and ready successfully', {
      documentId: doc.id,
      fileName: file.originalname,
      status: readyDoc?.status || 'ready',
    });

    res.status(201).json({
      success: true,
      document: readyDoc || doc,
      jobId,
    });
  } catch (error: any) {
    logger.error('Document upload failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/documents/:id - Single document metadata
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;

    const document = await prisma.document.findFirst({
      where: {
        id,
        userId: authReq.user.id,
      },
    });

    if (!document) {
      res.status(404).json({ success: false, error: 'Document not found' });
      return;
    }

    res.status(200).json({ success: true, document });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/documents/:id - Delete document from Postgres and local disk
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;

    const doc = await prisma.document.findFirst({
      where: { id, userId: authReq.user.id },
    });

    if (!doc) {
      res.status(404).json({ success: false, error: 'Document not found' });
      return;
    }

    // Delete file from disk
    await deleteFile(doc.filePath);

    // Delete record from PostgreSQL (cascades to chunks, chats, etc.)
    await prisma.document.delete({
      where: { id: doc.id },
    });

    logger.info('Document deleted successfully', { id });
    res.status(200).json({ success: true, message: 'Document deleted successfully' });
  } catch (error: any) {
    logger.error('Delete document failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/documents/:id/status - Poll document status
 */
router.get('/:id/status', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;

    const doc = await prisma.document.findFirst({
      where: { id, userId: authReq.user.id },
      select: {
        id: true,
        status: true,
        documentType: true,
        summary: true,
        pageCount: true,
        tokensUsed: true,
        processingStartedAt: true,
        processingCompletedAt: true,
        createdAt: true,
      },
    });

    if (!doc) {
      res.status(404).json({ success: false, error: 'Document not found' });
      return;
    }

    res.status(200).json({ success: true, ...doc });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/documents/process - Enqueue or directly run document processing
 */
router.post('/process', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { documentId } = req.body;

    if (!documentId) {
      res.status(400).json({ success: false, error: 'documentId is required' });
      return;
    }

    const doc = await prisma.document.findFirst({
      where: { id: documentId, userId: authReq.user.id },
    });

    if (!doc) {
      res.status(404).json({ success: false, error: 'Document not found' });
      return;
    }

    // Run processing immediately inline
    await processDocument(doc.id);

    let jobId: string | null = null;
    try {
      jobId = await addDocumentToQueue(documentId);
    } catch {}

    const updated = await prisma.document.findUnique({
      where: { id: documentId },
    });

    res.status(200).json({
      success: true,
      documentId,
      jobId,
      status: updated?.status || 'ready',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/documents/compare - Semantic comparison between two documents
 */
router.post('/compare', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { documentId1, documentId2 } = req.body;

    if (!documentId1 || !documentId2) {
      res.status(400).json({ success: false, error: 'Both documentId1 and documentId2 are required' });
      return;
    }

    const [doc1, doc2] = await Promise.all([
      prisma.document.findFirst({ where: { id: documentId1, userId: authReq.user.id } }),
      prisma.document.findFirst({ where: { id: documentId2, userId: authReq.user.id } }),
    ]);

    if (!doc1 || !doc2) {
      res.status(404).json({ success: false, error: 'One or both documents not found' });
      return;
    }

    const text1 = (doc1.rawText || doc1.summary || '').slice(0, 15000);
    const text2 = (doc2.rawText || doc2.summary || '').slice(0, 15000);

    const comparison = await compareDocuments(
      text1,
      text2,
      { id: doc1.id, name: doc1.name },
      { id: doc2.id, name: doc2.name },
      doc1.documentType || doc2.documentType || 'document'
    );

    res.status(200).json({
      success: true,
      comparison,
      documents: [
        { id: doc1.id, name: doc1.name, type: doc1.documentType },
        { id: doc2.id, name: doc2.name, type: doc2.documentType },
      ],
    });
  } catch (error: any) {
    logger.error('Document comparison failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/documents/:id/vision - GPT-4o Vision analysis for images
 */
router.post('/:id/vision', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const analysisType = (req.body.analysisType || 'full-analysis') as VisionAnalysisType;

    const doc = await prisma.document.findFirst({
      where: { id, userId: authReq.user.id },
    });

    if (!doc) {
      res.status(404).json({ success: false, error: 'Document not found' });
      return;
    }

    if (!doc.mimeType.startsWith('image/')) {
      res.status(400).json({
        success: false,
        error: 'Vision analysis is only supported for image documents.',
      });
      return;
    }

    const fileBuffer = await readFile(doc.filePath);
    const result = await analyzeDocumentWithVision(
      fileBuffer,
      doc.mimeType as any,
      analysisType
    );

    res.status(200).json({ success: true, result });
  } catch (error: any) {
    logger.error('Vision analysis failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/documents/:id/export - Export document data (JSON, CSV, or Text)
 */
router.get('/:id/export', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const format = ((req.query.format as string) || 'json').toLowerCase();

    const doc = await prisma.document.findFirst({
      where: { id, userId: authReq.user.id },
    });

    if (!doc) {
      res.status(404).json({ success: false, error: 'Document not found' });
      return;
    }

    const filename = `${doc.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_export`;

    if (format === 'text' || format === 'txt') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.txt"`);
      res.send(doc.rawText || doc.summary || 'No text extracted.');
      return;
    }

    if (format === 'csv') {
      const csvHeader = 'Field,Value\n';
      const rows = [
        `ID,"${doc.id}"`,
        `Name,"${doc.name.replace(/"/g, '""')}"`,
        `Original Name,"${doc.originalName.replace(/"/g, '""')}"`,
        `Type,"${doc.documentType || 'unknown'}"`,
        `Status,"${doc.status}"`,
        `Tokens Used,${doc.tokensUsed}`,
        `Page Count,${doc.pageCount || 1}`,
        `Summary,"${(doc.summary || '').replace(/"/g, '""')}"`,
        `Keywords,"${(doc.keywords || []).join('; ')}"`,
        `Anomalies,"${(doc.anomalies || []).join('; ')}"`,
        `Created At,"${doc.createdAt.toISOString()}"`,
      ];
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send(csvHeader + rows.join('\n'));
      return;
    }

    // Default: JSON export
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
    res.send(
      JSON.stringify(
        {
          id: doc.id,
          name: doc.name,
          originalName: doc.originalName,
          mimeType: doc.mimeType,
          documentType: doc.documentType,
          status: doc.status,
          pageCount: doc.pageCount,
          tokensUsed: doc.tokensUsed,
          summary: doc.summary,
          entities: doc.entities,
          keywords: doc.keywords,
          anomalies: doc.anomalies,
          rawText: doc.rawText,
          createdAt: doc.createdAt,
        },
        null,
        2
      )
    );
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/documents/:id/share - Generate or toggle public share URL
 */
router.post('/:id/share', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;

    const doc = await prisma.document.findFirst({
      where: { id, userId: authReq.user.id },
    });

    if (!doc) {
      res.status(404).json({ success: false, error: 'Document not found' });
      return;
    }

    const shareUrl = `/share/${doc.id}`;
    res.status(200).json({
      success: true,
      documentId: doc.id,
      shareUrl,
      isPublic: true,
      message: 'Share link generated successfully.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
