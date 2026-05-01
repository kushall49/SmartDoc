import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { DocumentModel } from '@/models/Document';
import { ragChat, getUserChats, getChatHistory } from '@/services/rag-chat.service';
import { ok, err, unauthorized, notFound, serverError } from '@/lib/api-response';
import { z } from 'zod';
import mongoose from 'mongoose';

const chatSchema = z.object({
  documentId: z.string().min(1),
  message: z.string().min(1).max(4000),
  chatId: z.string().optional(),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .optional()
    .default([]),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorized();

    const body = await request.json();
    const parsed = chatSchema.safeParse(body);
    if (!parsed.success)
      return err(parsed.error.issues[0]?.message ?? 'Invalid request');

    const { documentId, message, chatId, conversationHistory } = parsed.data;
    const userId = new mongoose.Types.ObjectId(session.user.id);

    await connectDB();

    const doc = await DocumentModel.findOne({
      _id: documentId,
      userId,
    }).select('status name').lean();

    if (!doc) return notFound('Document');
    if (doc.status !== 'ready')
      return err(
        `Document is not ready for chat. Current status: ${doc.status}. Please wait for processing to complete.`,
        422
      );

    const result = await ragChat(
      message,
      documentId,
      userId,
      conversationHistory,
      chatId
    );

    return ok(result);
  } catch (e) {
    return serverError(e);
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorized();

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');
    const chatId = searchParams.get('chatId');
    const userId = new mongoose.Types.ObjectId(session.user.id);

    await connectDB();

    if (chatId) {
      const chat = await getChatHistory(chatId, userId);
      if (!chat) return notFound('Chat');
      return ok({ chat });
    }

    const chats = await getUserChats(userId, documentId ?? undefined);
    return ok({ chats });
  } catch (e) {
    return serverError(e);
  }
}
