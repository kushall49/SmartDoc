import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import DocumentModel from '@/models/Document';
import { handleApiError } from '@/lib/errors';

/**
 * GET /api/documents?userId=xxx
 * Get all documents for a user
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = parseInt(searchParams.get('skip') || '0');
    const status = searchParams.get('status');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const query: Record<string, unknown> = { userId };
    if (status) {
      query['status.stage'] = status;
    }

    const [documents, total] = await Promise.all([
      DocumentModel.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .select('-extractedText -embeddings'),
      DocumentModel.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      documents,
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + limit < total,
      },
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleApiError(error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    );
  }
}
