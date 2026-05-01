/**
 * Vision Analysis API
 * POST /api/documents/[id]/vision
 * Runs AI Vision (GPT-4o) analysis on an uploaded image document
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/db';
import { DocumentModel } from '@/models/Document';
import { authOptions } from '@/lib/auth';
import { analyzeDocumentWithVision, fullVisualIntelligence, VisionAnalysisType } from '@/services/vision.service';
import { logAuditEvent } from '@/services/audit.service';
import { handleApiError } from '@/lib/errors';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();

  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const doc = await DocumentModel.findOne({ _id: id, userId: session.user.id });
    if (!doc) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];
    const mimeType = doc.fileType?.toLowerCase();

    if (!imageTypes.some(t => mimeType?.includes(t.split('/')[1]))) {
      return NextResponse.json(
        { success: false, error: 'Vision analysis is only available for image documents (JPEG, PNG, WebP)' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const analysisType: VisionAnalysisType = body.analysisType || 'full-analysis';

    // Fetch image from S3 or local storage
    let imageBuffer: Buffer;
    try {
      const response = await fetch(doc.s3Url);
      if (!response.ok) throw new Error('Failed to fetch image');
      imageBuffer = Buffer.from(await response.arrayBuffer());
    } catch {
      return NextResponse.json({ success: false, error: 'Unable to retrieve document image' }, { status: 500 });
    }

    const normalizedMime = mimeType?.includes('png') ? 'image/png'
      : mimeType?.includes('webp') ? 'image/webp'
      : mimeType?.includes('gif') ? 'image/gif'
      : 'image/jpeg';

    const result = analysisType === 'full-analysis'
      ? await fullVisualIntelligence(imageBuffer, normalizedMime as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif')
      : await analyzeDocumentWithVision(imageBuffer, normalizedMime as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif', analysisType);

    await logAuditEvent(session.user.id, 'ai.vision-analyze', {
      resourceId: id,
      resourceType: 'document',
      metadata: { analysisType, processingTime: Date.now() - startTime },
      duration: Date.now() - startTime,
    });

    return NextResponse.json({ success: true, result, analysisType });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleApiError(error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: statusCode });
  }
}
