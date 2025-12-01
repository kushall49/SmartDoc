import openai, { OPENAI_CONFIG } from '@/lib/openai';
import { retrieveRelevantChunks } from './vector-search.service';
import { logger } from '@/lib/logger';
import ChatMessageModel from '@/models/ChatMessage';

export interface ChatContext {
  documentId: string;
  userId: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

/**
 * Chat with a document using RAG (Retrieval-Augmented Generation)
 */
export async function chatWithDocument(
  message: string,
  context: ChatContext
): Promise<{ response: string; retrievedChunks: string[] }> {
  try {
    logger.info('Starting RAG chat', {
      documentId: context.documentId,
      userId: context.userId,
      messageLength: message.length,
    });

    // Retrieve relevant chunks from the document
    const relevantChunks = await retrieveRelevantChunks(
      message,
      context.documentId,
      3
    );

    if (relevantChunks.length === 0) {
      throw new Error('No relevant content found in the document');
    }

    // Prepare context from relevant chunks
    const documentContext = relevantChunks.join('\n\n---\n\n');

    // Get conversation history (last 5 messages)
    const history = context.conversationHistory || [];
    const recentHistory = history.slice(-5);

    // Build messages for the chat completion
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      {
        role: 'system',
        content: `You are a helpful AI assistant that answers questions about documents. Use the following context from the document to answer the user's question. If the answer cannot be found in the context, say so clearly. Be concise and accurate.

Context from document:
${documentContext}`,
      },
      ...recentHistory,
      {
        role: 'user',
        content: message,
      },
    ];

    // Generate response
    const response = await openai.chat.completions.create({
      model: OPENAI_CONFIG.model,
      messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const assistantMessage = response.choices[0]?.message?.content?.trim() || '';

    if (!assistantMessage) {
      throw new Error('No response generated');
    }

    // Save conversation to database
    await Promise.all([
      ChatMessageModel.create({
        documentId: context.documentId,
        userId: context.userId,
        role: 'user',
        content: message,
        context: [],
      }),
      ChatMessageModel.create({
        documentId: context.documentId,
        userId: context.userId,
        role: 'assistant',
        content: assistantMessage,
        context: relevantChunks,
      }),
    ]);

    logger.info('RAG chat completed', {
      documentId: context.documentId,
      responseLength: assistantMessage.length,
    });

    return {
      response: assistantMessage,
      retrievedChunks: relevantChunks,
    };
  } catch (error) {
    logger.error('RAG chat failed', error as Error);
    throw new Error('Failed to chat with document');
  }
}

/**
 * Get conversation history for a document
 */
export async function getConversationHistory(
  documentId: string,
  userId: string,
  limit = 20
): Promise<Array<{ role: 'user' | 'assistant'; content: string; createdAt: Date }>> {
  try {
    const messages = await ChatMessageModel.find({ documentId, userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('role content createdAt');

    return messages.reverse().map((msg) => ({
      role: msg.role,
      content: msg.content,
      createdAt: msg.createdAt,
    }));
  } catch (error) {
    logger.error('Failed to get conversation history', error as Error);
    throw new Error('Failed to get conversation history');
  }
}

/**
 * Clear conversation history for a document
 */
export async function clearConversationHistory(
  documentId: string,
  userId: string
): Promise<void> {
  try {
    await ChatMessageModel.deleteMany({ documentId, userId });
    logger.info('Conversation history cleared', { documentId, userId });
  } catch (error) {
    logger.error('Failed to clear conversation history', error as Error);
    throw new Error('Failed to clear conversation history');
  }
}

/**
 * Generate suggested questions based on document content
 */
export async function generateSuggestedQuestions(
  documentSummary: string,
  documentType: string
): Promise<string[]> {
  try {
    logger.info('Generating suggested questions', { documentType });

    const response = await openai.chat.completions.create({
      model: OPENAI_CONFIG.model,
      messages: [
        {
          role: 'system',
          content: `You are an expert at generating insightful questions about documents. Generate 5 relevant questions that someone might want to ask about this ${documentType}. Return only the questions, one per line.`,
        },
        {
          role: 'user',
          content: `Document summary: ${documentSummary}`,
        },
      ],
      temperature: 0.8,
      max_tokens: 300,
    });

    const content = response.choices[0]?.message?.content || '';
    const questions = content
      .split('\n')
      .filter((q) => q.trim().length > 0)
      .map((q) => q.replace(/^\d+\.\s*/, '').trim());

    logger.info('Suggested questions generated', { count: questions.length });

    return questions.slice(0, 5);
  } catch (error) {
    logger.error('Failed to generate suggested questions', error as Error);
    return [
      'What is the main purpose of this document?',
      'What are the key points mentioned?',
      'Who are the main parties involved?',
      'What are the important dates?',
      'Is there any financial information?',
    ];
  }
}
