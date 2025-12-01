import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { chatWithDocument, getConversationHistory } from '@/services/rag.service';
import { handleApiError } from '@/lib/errors';

/**
 * POST /api/chat
 * Chat with a document using RAG
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { documentId, userId, message } = body;

    if (!documentId || !userId || !message) {
      return NextResponse.json(
        { success: false, error: 'documentId, userId, and message are required' },
        { status: 400 }
      );
    }

    // Get recent conversation history
    const history = await getConversationHistory(documentId, userId, 5);

    // Chat with document
    const { response, retrievedChunks } = await chatWithDocument(message, {
      documentId,
      userId,
      conversationHistory: history,
    });

    return NextResponse.json({
      success: true,
      response,
      retrievedChunks,
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleApiError(error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    );
  }
}

/**
 * GET /api/chat?documentId=xxx&userId=xxx
 * Get conversation history
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const documentId = searchParams.get('documentId');
    const userId = searchParams.get('userId');

    if (!documentId || !userId) {
      return NextResponse.json(
        { success: false, error: 'documentId and userId are required' },
        { status: 400 }
      );
    }

    const history = await getConversationHistory(documentId, userId);

    return NextResponse.json({
      success: true,
      history,
      count: history.length,
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleApiError(error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    );
  }
}
