/**
 * Cross-Document Intelligence API
 * POST /api/intelligence
 * Analyzes patterns, contradictions & relationships across ALL documents
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/db';
import { authOptions } from '@/lib/auth';
import {
  analyzeAcrossDocuments,
  clusterDocumentsByTopic,
  trackEntityAcrossDocuments,
} from '@/services/intelligence.service';
import { logAuditEvent } from '@/services/audit.service';
import { handleApiError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { query, mode, entityValue } = await request.json();
    const userId = session.user.id;

    let result;

    switch (mode) {
      case 'entity-timeline':
        if (!entityValue) {
          return NextResponse.json({ success: false, error: 'entityValue required for entity-timeline mode' }, { status: 400 });
        }
        const timeline = await trackEntityAcrossDocuments(userId, entityValue);
        result = { entityTimelines: [timeline] };
        break;

      case 'cluster':
        const clusters = await clusterDocumentsByTopic(userId);
        result = { clusters };
        break;

      case 'full-analysis':
      default:
        if (!query) {
          return NextResponse.json({ success: false, error: 'query is required for full-analysis mode' }, { status: 400 });
        }
        result = await analyzeAcrossDocuments(userId, query);
    }

    await logAuditEvent(userId, 'ai.cross-intelligence', {
      metadata: { mode, query, processingTime: Date.now() - startTime },
      duration: Date.now() - startTime,
    });

    return NextResponse.json({ success: true, result, mode });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleApiError(error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: statusCode });
  }
}
