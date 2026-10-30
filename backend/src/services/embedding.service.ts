import OpenAI from 'openai';
import { logger } from '@/lib/logger';
import { searchSimilarChunks } from '@/services/vector-search.service';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const EMBEDDING_DIMENSIONS = 1536;

export interface TextChunk {
  text: string;
  tokenEstimate: number;
  page?: number;
}

/**
 * Split text into overlapping chunks suitable for embedding.
 * Handles sentences, table lines, and structured documents.
 */
export function chunkText(
  text: string,
  chunkSize = 600,
  overlap = 80
): TextChunk[] {
  if (!text || text.trim().length === 0) return [];

  // Split on newlines OR sentence endings
  const segments = text
    .split(/(?<=[.!?\n])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const chunks: TextChunk[] = [];
  let current = '';
  let currentTokens = 0;

  for (const seg of segments) {
    const segTokens = Math.ceil(seg.length / 4);

    if (currentTokens + segTokens > chunkSize && current.length > 0) {
      chunks.push({ text: current.trim(), tokenEstimate: currentTokens });
      const words = current.split(/\s+/);
      const overlapWords = words.slice(-Math.ceil(overlap / 4));
      current = overlapWords.join(' ') + '\n' + seg;
      currentTokens = Math.ceil(current.length / 4);
    } else {
      current += (current ? '\n' : '') + seg;
      currentTokens += segTokens;
    }
  }

  if (current.trim().length > 10) {
    chunks.push({ text: current.trim(), tokenEstimate: currentTokens });
  }

  return chunks.filter((c) => c.text.length > 10);
}

/**
 * Deterministic unit vector fallback (1536-d) when OpenAI API quota is exhausted.
 */
export function generateFallbackEmbedding(text: string): number[] {
  const dim = EMBEDDING_DIMENSIONS;
  const vec = new Float64Array(dim);
  const normalized = text.toLowerCase().slice(0, 3000);

  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i);
    const pos = Math.abs((code * 31 + i * 17) % dim);
    vec[pos] += 1.0;
  }

  let norm = 0;
  for (let i = 0; i < dim; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm) || 1.0;
  return Array.from(vec).map((v) => Number((v / norm).toFixed(6)));
}

/**
 * Generate embeddings in batches to stay within API limits.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  try {
    const BATCH_SIZE = 100;
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: batch,
      });
      allEmbeddings.push(...response.data.map((d) => d.embedding));
    }

    return allEmbeddings;
  } catch (err: any) {
    logger.warn('OpenAI embedding generation failed, using deterministic unit vectors', {
      error: err?.message || String(err),
      count: texts.length,
    });
    return texts.map((t) => generateFallbackEmbedding(t));
  }
}

/**
 * Generate a single embedding for a search query.
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: [query.slice(0, 8000)],
    });
    return response.data[0].embedding;
  } catch (err: any) {
    logger.warn('OpenAI query embedding failed, using deterministic fallback vector', {
      error: err?.message || String(err),
    });
    return generateFallbackEmbedding(query);
  }
}

/**
 * Retrieve top relevant chunks for RAG via native PostgreSQL pgvector.
 */
export async function retrieveRelevantChunks(
  query: string,
  userId: string,
  documentId?: string,
  limit = 5
): Promise<string[]> {
  const queryEmbedding = await generateQueryEmbedding(query);
  const results = await searchSimilarChunks({
    userId,
    queryEmbedding,
    documentId,
    limit,
    minSimilarity: 0.05,
  });

  return results.map((r) => r.chunkText);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const mag = Math.sqrt(magA) * Math.sqrt(magB);
  return mag === 0 ? 0 : dot / mag;
}
