import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import DocumentModel from '@/models/Document';
import { handleApiError } from '@/lib/errors';
import { logger } from '@/lib/logger';

/**
 * POST /api/documents/process
 * Mark document as ready for processing (immediate processing without queue)
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { documentId } = body;

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Get document
    const document = await DocumentModel.findById(documentId);

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    // Update status to processing (simulating immediate processing)
    await DocumentModel.findByIdAndUpdate(documentId, {
      'status.stage': 'processing',
      'status.progress': 50,
      'status.message': 'Processing document...',
      'status.startedAt': new Date(),
    });

    // Simulate completion immediately (in real production, process in background)
    setTimeout(async () => {
      try {
        await DocumentModel.findByIdAndUpdate(documentId, {
          'status.stage': 'completed',
          'status.progress': 100,
          'status.message': 'Processing completed',
          'status.completedAt': new Date(),
        });
        logger.info('Document processing completed', { documentId });
      } catch (err) {
        logger.error('Failed to complete document processing', err as Error);
      }
    }, 2000);

    logger.info('Document marked for processing', { documentId });

    return NextResponse.json({
      success: true,
      message: 'Document processing started',
      documentId,
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleApiError(error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    );
  }
}
