/**
 * Audit Trail API
 * GET /api/audit - Get user's audit log
 * GET /api/audit/usage - Get AI usage summary
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { getUserAuditTrail, getUserUsageSummary, AuditAction } from '@/services/audit.service';
import { handleApiError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get('mode') || 'trail';

    if (mode === 'usage') {
      const days = parseInt(searchParams.get('days') || '30');
      const summary = await getUserUsageSummary(session.user.id, days);
      return NextResponse.json({ success: true, summary, period: `${days} days` });
    }

    const action = searchParams.get('action') as AuditAction | null;
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');
    const fromDate = searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined;
    const toDate = searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined;

    const { entries, total } = await getUserAuditTrail(session.user.id, {
      action: action || undefined,
      limit,
      skip,
      fromDate,
      toDate,
    });

    return NextResponse.json({
      success: true,
      entries,
      pagination: { total, limit, skip, hasMore: skip + limit < total },
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleApiError(error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: statusCode });
  }
}
