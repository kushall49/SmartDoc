import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { semanticSearch } from '@/services/vector-search.service';
import { handleApiError } from '@/lib/errors';

/**
 * GET /api/search?q=query&userId=xxx&limit=10
 * Semantic search across documents
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Search query is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    const results = await semanticSearch(query, userId, limit);
    const executionTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      query,
      results,
      count: results.length,
      executionTime,
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleApiError(error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    );
  }
}
