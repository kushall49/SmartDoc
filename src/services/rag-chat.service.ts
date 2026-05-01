import { Embedding } from '@/models/Embedding';
import { DocumentModel } from '@/models/Document';
import { Chat } from '@/models/Chat';
import { runAI } from '@/services/model-router.service';
import { generateQueryEmbedding, cosineSimilarity } from '@/services/embedding.service';
import { connectDB } from '@/lib/db';
import { logger } from '@/lib/logger';
import mongoose from 'mongoose';

export interface ChatSource {
  documentId: string;
  documentName: string;
  chunkText: string;
  page?: number;
  similarity: number;
}

export interface RagChatResult {
  answer: string;
  sources: ChatSource[];
  tokensUsed: number;
  provider: string;
  model: string;
  chatId: string;
}

const CHAT_SYSTEM = `You are a helpful, conversational, and highly intelligent document assistant. Answer questions based ONLY on the provided document context.

Rules:
1. Write naturally and conversationally, just like ChatGPT. Use well-structured paragraphs, bold text for emphasis, and bullet points where appropriate. Avoid acting like a rigid robot that just outputs dry lists. Provide comprehensive, insightful summaries.
2. Only use information explicitly present in the context below.
3. If the answer is not in the context, politely say: "I could not find that information in this document."
4. You may reference specific source numbers if it's helpful (e.g., "[Source 1]"), but weave them organically into your sentences instead of aggressively appending them to every line.
5. For financial amounts, preserve exact numbers.
6. Format your output cleanly with markdown (headers, bolding, lists) to make it highly readable.`;

export async function ragChat(
  question: string,
  documentId: string,
  userId: mongoose.Types.ObjectId,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  chatId?: string
): Promise<RagChatResult> {
  await connectDB();

  // Get or create chat session
  let chat = chatId
    ? await Chat.findOne({ _id: chatId, userId })
    : null;

  if (!chat) {
    chat = await Chat.create({
      userId,
      documentId: new mongoose.Types.ObjectId(documentId),
      title: question.slice(0, 80),
      messages: [],
      totalTokensUsed: 0,
    });
  }

  // Get query embedding
  const queryEmbedding = await generateQueryEmbedding(question);

  // Retrieve relevant chunks
  const embeddings = await Embedding.find({
    documentId: new mongoose.Types.ObjectId(documentId),
    userId,
  }).lean();

  if (embeddings.length === 0) {
    const noEmbeddingAnswer =
      'This document has not been fully processed yet. Please wait for processing to complete before chatting.';

    chat.messages.push({ role: 'user', content: question, createdAt: new Date() });
    chat.messages.push({
      role: 'assistant',
      content: noEmbeddingAnswer,
      createdAt: new Date(),
    });
    await chat.save();

    return {
      answer: noEmbeddingAnswer,
      sources: [],
      tokensUsed: 0,
      provider: 'none',
      model: 'none',
      chatId: chat._id.toString(),
    };
  }

  // Rank chunks by similarity
  const ranked = embeddings
    .map((e) => ({
      ...e,
      similarity: cosineSimilarity(queryEmbedding, e.embedding),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 30);

  const doc = await DocumentModel.findById(documentId).select('name').lean();
  const docName = doc?.name ?? 'Document';

  const sources: ChatSource[] = ranked
    .filter((e) => e.similarity > 0.25)
    .map((e) => ({
      documentId,
      documentName: docName,
      chunkText: e.chunkText,
      page: e.pageNumber,
      similarity: Math.round(e.similarity * 100) / 100,
    }));

  // Build context from top chunks
  const context = ranked
    .slice(0, 30)
    .map(
      (e, i) =>
        `[Source ${i + 1}${e.pageNumber ? ` - Page ${e.pageNumber}` : ''}]\n${e.chunkText}`
    )
    .join('\n\n---\n\n');

  // Add conversation history (last 3 exchanges = 6 messages)
  const historyText = conversationHistory
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');

  const userPrompt = [
    context ? `Document context:\n${context}` : '',
    historyText ? `\nPrevious conversation:\n${historyText}` : '',
    `\nQuestion: ${question}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const result = await runAI('chat', CHAT_SYSTEM, userPrompt, {
    userId,
    documentId: new mongoose.Types.ObjectId(documentId),
    maxTokens: 4000,
  });

  // Save messages to chat
  chat.messages.push({
    role: 'user',
    content: question,
    createdAt: new Date(),
  });
  chat.messages.push({
    role: 'assistant',
    content: result.content,
    sources: sources.slice(0, 3).map((s) => ({
      documentId: s.documentId,
      documentName: s.documentName,
      chunkText: s.chunkText.slice(0, 300),
      page: s.page,
      similarity: s.similarity,
    })),
    tokensUsed: result.inputTokens + result.outputTokens,
    provider: result.provider,
    model: result.model,
    createdAt: new Date(),
  });
  chat.totalTokensUsed += result.inputTokens + result.outputTokens;
  await chat.save();

  logger.info('RAG chat completed', {
    documentId,
    sources: sources.length,
    tokens: result.inputTokens + result.outputTokens,
  });

  return {
    answer: result.content,
    sources,
    tokensUsed: result.inputTokens + result.outputTokens,
    provider: result.provider,
    model: result.model,
    chatId: chat._id.toString(),
  };
}

export async function getChatHistory(
  chatId: string,
  userId: mongoose.Types.ObjectId
) {
  await connectDB();
  return Chat.findOne({ _id: chatId, userId }).lean();
}

export async function getUserChats(
  userId: mongoose.Types.ObjectId,
  documentId?: string
) {
  await connectDB();
  const query: Record<string, unknown> = { userId };
  if (documentId) query.documentId = new mongoose.Types.ObjectId(documentId);
  return Chat.find(query).select('-messages').sort({ updatedAt: -1 }).limit(50).lean();
}
