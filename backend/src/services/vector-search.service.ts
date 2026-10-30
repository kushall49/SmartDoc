import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export interface ChunkSearchResult {
  id: string;
  documentId: string;
  documentName: string;
  chunkIndex: number;
  chunkText: string;
  pageNumber: number | null;
  similarity: number;
}

export interface SearchSimilarChunksParams {
  userId: string;
  queryEmbedding: number[];
  documentId?: string;
  limit?: number;
  minSimilarity?: number;
}

export interface DocumentChunkInput {
  chunkIndex: number;
  chunkText: string;
  chunkTokens?: number;
  pageNumber?: number;
  embedding: number[];
}

/**
 * Perform vector similarity search directly in PostgreSQL using pgvector's <=> cosine operator.
 * Replaces the legacy in-memory cosine similarity loop.
 */
export async function searchSimilarChunks(
  params: SearchSimilarChunksParams
): Promise<ChunkSearchResult[]> {
  const {
    userId,
    queryEmbedding,
    documentId,
    limit = 30,
    minSimilarity = 0.0,
  } = params;

  if (!queryEmbedding || queryEmbedding.length === 0) {
    return [];
  }

  const vectorString = `[${queryEmbedding.join(',')}]`;

  // Multi-tenant check: always scoped to userId.
  // Optional single-document filter or cross-document search across all user documents.
  const docFilter = documentId
    ? Prisma.sql`AND c.document_id = ${documentId}::uuid`
    : Prisma.empty;

  const minSimFilter =
    minSimilarity > 0
      ? Prisma.sql`AND (1 - (c.embedding <=> ${vectorString}::vector)) >= ${minSimilarity}`
      : Prisma.empty;

  try {
    const results = await prisma.$queryRaw<ChunkSearchResult[]>`
      SELECT 
        c.id,
        c.document_id AS "documentId",
        d.name AS "documentName",
        c.chunk_index AS "chunkIndex",
        c.chunk_text AS "chunkText",
        c.page_number AS "pageNumber",
        (1 - (c.embedding <=> ${vectorString}::vector))::float AS "similarity"
      FROM chunks c
      JOIN documents d ON d.id = c.document_id
      WHERE c.user_id = ${userId}::uuid
        ${docFilter}
        ${minSimFilter}
      ORDER BY c.embedding <=> ${vectorString}::vector ASC
      LIMIT ${limit};
    `;

    return results;
  } catch (error) {
    logger.error('pgvector similarity search failed', {
      error: String(error),
      userId,
      documentId,
    });
    throw new Error('Failed to perform vector similarity search');
  }
}

/**
 * Batch store document chunks with 1536-d vector embeddings in PostgreSQL.
 */
export async function storeDocumentChunks(
  documentId: string,
  userId: string,
  chunks: DocumentChunkInput[]
): Promise<void> {
  if (chunks.length === 0) return;

  try {
    // Delete any existing chunks for this document to ensure idempotency
    await prisma.$executeRaw`
      DELETE FROM chunks 
      WHERE document_id = ${documentId}::uuid AND user_id = ${userId}::uuid;
    `;

    // Insert chunks in batches
    for (const chunk of chunks) {
      const vectorStr = `[${chunk.embedding.join(',')}]`;
      await prisma.$executeRaw`
        INSERT INTO chunks (
          id,
          document_id,
          user_id,
          chunk_index,
          chunk_text,
          chunk_tokens,
          page_number,
          embedding,
          created_at
        ) VALUES (
          gen_random_uuid(),
          ${documentId}::uuid,
          ${userId}::uuid,
          ${chunk.chunkIndex},
          ${chunk.chunkText},
          ${chunk.chunkTokens ?? 0},
          ${chunk.pageNumber ?? null},
          ${vectorStr}::vector,
          NOW()
        );
      `;
    }

    logger.info('Stored document chunks in pgvector successfully', {
      documentId,
      chunkCount: chunks.length,
    });
  } catch (error) {
    logger.error('Failed to store document chunks in pgvector', {
      error: String(error),
      documentId,
    });
    throw new Error('Failed to store document chunks in database');
  }
}

/**
 * Find similar documents to a source document using pgvector.
 * Computes average similarity of the source document's chunks across all other user documents.
 */
export async function findSimilarDocuments(
  documentId: string,
  userId: string,
  limit = 5
): Promise<Array<{ documentId: string; documentName: string; score: number }>> {
  try {
    // Find representative chunk embedding from source document
    const sourceChunk = await prisma.$queryRaw<Array<{ embedding_str: string }>>`
      SELECT embedding::text AS embedding_str
      FROM chunks
      WHERE document_id = ${documentId}::uuid AND user_id = ${userId}::uuid
      ORDER BY chunk_index ASC
      LIMIT 1;
    `;

    if (sourceChunk.length === 0 || !sourceChunk[0].embedding_str) {
      return [];
    }

    const sourceVectorStr = sourceChunk[0].embedding_str;

    const similarDocs = await prisma.$queryRaw<
      Array<{ documentId: string; documentName: string; score: number }>
    >`
      SELECT 
        d.id AS "documentId",
        d.name AS "documentName",
        MAX(1 - (c.embedding <=> ${sourceVectorStr}::vector))::float AS "score"
      FROM chunks c
      JOIN documents d ON d.id = c.document_id
      WHERE c.user_id = ${userId}::uuid
        AND c.document_id != ${documentId}::uuid
      GROUP BY d.id, d.name
      ORDER BY "score" DESC
      LIMIT ${limit};
    `;

    return similarDocs;
  } catch (error) {
    logger.error('Failed to find similar documents via pgvector', {
      error: String(error),
      documentId,
    });
    throw new Error('Failed to find similar documents');
  }
}

/**
 * Delete all chunks for a document.
 */
export async function deleteDocumentChunks(
  documentId: string,
  userId: string
): Promise<void> {
  await prisma.$executeRaw`
    DELETE FROM chunks 
    WHERE document_id = ${documentId}::uuid AND user_id = ${userId}::uuid;
  `;
}
