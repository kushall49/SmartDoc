import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { DocumentModel } from '@/models/Document';
import { Embedding } from '@/models/Embedding';
import { generateQueryEmbedding, cosineSimilarity } from '@/services/embedding.service';
import { runAI } from '@/services/model-router.service';
import { unauthorized } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import mongoose from 'mongoose';

function sseChunk(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

const CHAT_SYSTEM = `You are a helpful, conversational, and highly intelligent document assistant. Answer questions based ONLY on the provided document context.

Rules:
1. Write naturally and conversationally, just like ChatGPT. Use well-structured paragraphs, bold text for emphasis, and bullet points where appropriate. Avoid acting like a rigid robot that just outputs dry lists. Provide comprehensive, insightful summaries.
2. Only use information explicitly present in the context below.
3. If the answer is not in the context, politely say: "I could not find that information in this document."
4. You may reference specific source numbers if it's helpful (e.g., "[Source 1]"), but weave them organically into your sentences instead of aggressively appending them to every line.
5. For financial amounts, preserve exact numbers.
6. Format your output cleanly with markdown (headers, bolding, lists) to make it highly readable.`;

function buildFallbackAnswer(message: string, hasContext: boolean): string {
  if (!hasContext) {
    return `I couldn't find indexed content for this document yet. Please wait for processing to finish, then ask again.\n\nYour question: "${message}"`;
  }
  return `I can help, but AI generation is currently unavailable. I found relevant context for your question:\n- Ask for a summary\n- Ask for key entities (names, dates, amounts)\n- Ask for anomalies or missing information\n\nQuestion received: "${message}"`;
}

function tokenizeForRetrieval(input: string): string[] {
  const stopWords = new Set([
    'what', 'which', 'where', 'when', 'why', 'how', 'is', 'are', 'was', 'were',
    'the', 'a', 'an', 'to', 'for', 'of', 'in', 'on', 'and', 'or', 'me', 'this',
    'that', 'please', 'give', 'tell', 'about', 'with', 'from', 'who',
  ]);
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !stopWords.has(t));
}

function selectRelevantPassages(fullText: string, question: string, limit = 6): string[] {
  const normalized = fullText.replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim();
  if (!normalized) return [];

  const queryTerms = tokenizeForRetrieval(question);
  const candidates = normalized
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+/))
    .map((p) => p.trim())
    .filter((p) => p.length >= 12)
    .slice(0, 3000);

  if (queryTerms.length === 0) return candidates.slice(0, limit);

  const scored = candidates.map((passage) => {
    const lower = passage.toLowerCase();
    let score = 0;
    for (const term of queryTerms) {
      if (lower.includes(term)) score += 2;
    }
    if (queryTerms.length >= 2 && lower.includes(queryTerms.join(' '))) score += 2;
    if (/:/.test(passage)) score += 0.15;
    return { passage, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .filter((s) => s.score > 0)
    .slice(0, limit)
    .map((s) => s.passage);
}

function answerFromContextHeuristics(message: string, context: string): string | null {
  const normalized = context.replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim();
  if (!normalized) return null;
  const lowerQuestion = message.toLowerCase();

  const queryTerms = tokenizeForRetrieval(message);

  const passages = normalized
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+/))
    .map((p) => p.trim())
    .filter((p) => p.length >= 12)
    .slice(0, 500);

  if (passages.length === 0) return null;

  // Summary requests should produce a compact overview, not repeated key-value lines.
  if (/\b(summary|summarize|overview|brief)\b/.test(lowerQuestion)) {
    const summaryLines = passages
      .filter((p) => p.length > 24)
      .slice(0, 6)
      .filter((p, i, arr) => arr.findIndex((x) => x.toLowerCase() === p.toLowerCase()) === i)
      .slice(0, 2);
    if (summaryLines.length > 0) {
      return `Quick summary from extracted text:\n- ${summaryLines.join('\n- ')}`;
    }
  }

  const scored = passages.map((p) => {
    const lower = p.toLowerCase();
    let score = 0;
    let matchedTerms = 0;
    for (const term of queryTerms) {
      if (lower.includes(term)) {
        score += 2;
        matchedTerms += 1;
      }
    }
    if (queryTerms.length >= 2 && lower.includes(queryTerms.join(' '))) score += 3;
    // Numeric/currency hints only help when question is likely financial.
    if (/\b(total|amount|price|cost|subtotal|tax|invoice|payment)\b/.test(lowerQuestion)) {
      if (/[₹$]|(?:\b(?:inr|usd|eur|rs\.?)\b)|\d{1,3}(?:,\d{3})+/.test(p)) score += 0.75;
    }
    if (/:/.test(p)) score += 0.1;
    // Penalize generic lines when no query term matched.
    if (queryTerms.length > 0 && matchedTerms === 0) score -= 0.75;
    return { passage: p, score };
  });

  scored.sort((a, b) => b.score - a.score || a.passage.length - b.passage.length);
  const best = scored.filter((s) => s.score > 0).slice(0, 3).map((s) => s.passage);

  if (best.length === 0) {
    const fallbackSummary = passages.slice(0, 2).join(' ');
    return `I couldn't find a precise match for that question, but here is the closest extracted context: ${fallbackSummary.slice(0, 450)}${fallbackSummary.length > 450 ? '...' : ''}`;
  }

  return `Based on the extracted document text, here are the most relevant lines:\n- ${best.join('\n- ')}`;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise
      .then((value) => {
        clearTimeout(id);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(id);
        reject(error);
      });
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const { message, documentId, crossDocument } = body as {
    message?: string;
    documentId?: string;
    crossDocument?: boolean;
  };

  if (!message?.trim()) {
    return new Response(sseChunk({ type: 'error', error: 'Message is required' }), {
      headers: { 'Content-Type': 'text/event-stream' },
    });
  }

  const userId = new mongoose.Types.ObjectId(session.user.id);

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) =>
        controller.enqueue(new TextEncoder().encode(sseChunk(data)));

      try {
        await connectDB();

        // Get query embedding (fallback to empty ranking if embeddings are unavailable)
        let queryEmbedding: number[] | null = null;
        try {
          queryEmbedding = await generateQueryEmbedding(message);
        } catch (embeddingError) {
          logger.warn('Query embedding unavailable, continuing without semantic ranking', {
            error: String(embeddingError),
          });
        }

        // Retrieve relevant chunks
        const embeddingQuery: Record<string, unknown> = { userId };
        if (!crossDocument && documentId) {
          embeddingQuery.documentId = new mongoose.Types.ObjectId(documentId);
        }

        const embeddings = await Embedding.find(embeddingQuery)
          .select('embedding documentId chunkText pageNumber')
          .lean();

        const ranked = queryEmbedding
          ? (embeddings
              .reduce((acc, e) => {
                const sim = cosineSimilarity(queryEmbedding as number[], e.embedding);
                if (sim > 0.25) acc.push({ ...e, similarity: sim });
                return acc;
              }, [] as Array<typeof embeddings[0] & { similarity: number }>)
              .sort((a, b) => b.similarity - a.similarity)
              .slice(0, 30))
          : [];

        // Fallback retrieval: when semantic index is unavailable, use raw extracted text
        // from the selected document so users can still ask basic questions.
        if (ranked.length === 0 && documentId && !crossDocument) {
          const docWithText = await DocumentModel.findOne({
            _id: new mongoose.Types.ObjectId(documentId),
            userId,
          })
            .select('name rawText extractedText')
            .lean<{ _id: mongoose.Types.ObjectId; name: string; rawText?: string; extractedText?: string } | null>();

          const fallbackText = (docWithText?.rawText ?? docWithText?.extractedText ?? '').trim();
          if (fallbackText.length > 0) {
            const passages = selectRelevantPassages(fallbackText, message, 6);
            const snippets = passages.length > 0 ? passages : [fallbackText.slice(0, 500)];
            snippets.forEach((snippet, idx) => {
              ranked.push({
                documentId: docWithText!._id,
                chunkText: snippet.slice(0, 700),
                pageNumber: idx + 1,
                similarity: 0.55 - idx * 0.05,
              } as unknown as (typeof ranked)[number]);
            });
          }
        }

        // Fetch document names for citations
        const docIds = [...new Set(ranked.map((e) => e.documentId.toString()))];
        const docNames: Record<string, string> = {};
        if (docIds.length > 0) {
          const docs = await DocumentModel.find({ _id: { $in: docIds } })
            .select('name')
            .lean();
          docs.forEach((d) => {
            docNames[d._id.toString()] = d.name;
          });
        }

        const citations = ranked.slice(0, 3).map((e) => ({
          documentId: e.documentId.toString(),
          documentName: docNames[e.documentId.toString()] ?? 'Document',
          chunkText: e.chunkText.slice(0, 300),
          page: e.pageNumber,
          similarity: Math.round(e.similarity * 100) / 100,
        }));

        // Send citations first
        send({ type: 'citations', citations });

        // Build context
        const context = ranked
          .slice(0, 30)
          .map(
            (e, i) =>
              `[Source ${i + 1}${crossDocument ? ` from "${docNames[e.documentId.toString()]}"` : ''}${e.pageNumber ? ` p.${e.pageNumber}` : ''}]\n${e.chunkText}`
          )
          .join('\n\n---\n\n');

        const userContent = context
          ? `Context:\n${context}\n\nQuestion: ${message}`
          : message;

        const hasAiProvider =
          Boolean(process.env.OPENAI_API_KEY) ||
          Boolean(process.env.ANTHROPIC_API_KEY) ||
          Boolean(process.env.GROQ_API_KEY);

        if (hasAiProvider) {
          try {
            const ai = await withTimeout(
              runAI(
                'chat',
                CHAT_SYSTEM,
                userContent,
                {
                  userId,
                  documentId: documentId ? new mongoose.Types.ObjectId(documentId) : undefined,
                  maxTokens: 4000,
                }
              ),
              20000,
              'AI chat response'
            );
            const content = ai.content?.trim();
            if (content) send({ type: 'token', token: content });
            else {
              const heuristic = answerFromContextHeuristics(message, context);
              const fallback =
                heuristic ?? buildFallbackAnswer(message, ranked.length > 0);
              send({ type: 'token', token: fallback });
            }
          } catch (aiError) {
            logger.warn('AI chat failed, using extractive fallback', {
              error: String(aiError),
            });
            const heuristic = answerFromContextHeuristics(message, context);
            const fallback =
              heuristic ?? buildFallbackAnswer(message, ranked.length > 0);
            send({ type: 'token', token: fallback });
          }
        } else {
          const heuristic = answerFromContextHeuristics(message, context);
          const fallback =
            heuristic ?? buildFallbackAnswer(message, ranked.length > 0);
          send({ type: 'token', token: fallback });
        }

        send({ type: 'done' });
      } catch (e) {
        logger.error('Streaming chat error', { error: String(e) });
        send({ type: 'error', error: 'An error occurred while generating the response' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
