import OpenAI from 'openai';
import { logger } from '@/lib/logger';

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
 * Tries to split on sentence boundaries.
 */
export function chunkText(
  text: string,
  chunkSize = 600,
  overlap = 80
): TextChunk[] {
  if (!text || text.trim().length === 0) return [];

  // Clean the text first
  const cleaned = text.replace(/\s+/g, ' ').trim();

  // Split on sentence endings
  const sentences = cleaned.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) ?? [cleaned];

  const chunks: TextChunk[] = [];
  let current = '';
  let currentTokens = 0;

  for (const sentence of sentences) {
    const sentenceTokens = Math.ceil(sentence.length / 4);

    if (currentTokens + sentenceTokens > chunkSize && current.length > 0) {
      chunks.push({ text: current.trim(), tokenEstimate: currentTokens });

      // Overlap: keep last N words
      const words = current.split(' ');
      const overlapWords = words.slice(-Math.ceil((overlap / 4)));
      current = overlapWords.join(' ') + ' ' + sentence;
      currentTokens = Math.ceil(current.length / 4);
    } else {
      current += (current ? ' ' : '') + sentence;
      currentTokens += sentenceTokens;
    }
  }

  if (current.trim().length > 20) {
    chunks.push({ text: current.trim(), tokenEstimate: currentTokens });
  }

  return chunks.filter((c) => c.text.length > 20);
}

/**
 * Generate embeddings in batches to stay within API limits.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const BATCH_SIZE = 100;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    logger.debug('Generating embeddings batch', {
      batch: `${i / BATCH_SIZE + 1}`,
      size: batch.length,
    });
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
    });
    allEmbeddings.push(...response.data.map((d) => d.embedding));
  }

  return allEmbeddings;
}

/**
 * Generate a single embedding for a search query.
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: [query.slice(0, 8000)],
  });
  return response.data[0].embedding;
}

/**
 * Cosine similarity between two vectors.
 */
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
