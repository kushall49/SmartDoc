import { generateEmbeddings, cosineSimilarity } from './ai.service';
import { logger } from '@/lib/logger';
import DocumentModel from '@/models/Document';
import { Embedding } from '@/types';

/**
 * Search for documents using semantic similarity
 */
export async function semanticSearch(
  query: string,
  userId: string,
  limit = 10
): Promise<Array<{ documentId: string; score: number; snippet: string }>> {
  try {
    logger.info('Performing semantic search', { query, userId, limit });

    // Generate embedding for the query
    const [queryEmbedding] = await generateEmbeddings([query]);

    // Get all documents with embeddings for this user
    const documents = await DocumentModel.find({
      userId,
      'embeddings.0': { $exists: true },
    }).select('_id embeddings');

    // Calculate similarity scores for each document chunk
    const results: Array<{
      documentId: string;
      chunkIndex: number;
      score: number;
      text: string;
    }> = [];

    for (const doc of documents) {
      if (!doc.embeddings || doc.embeddings.length === 0) continue;

      for (const embedding of doc.embeddings) {
        const similarity = cosineSimilarity(queryEmbedding, embedding.vector);
        results.push({
          documentId: doc._id.toString(),
          chunkIndex: embedding.chunkIndex,
          score: similarity,
          text: embedding.text,
        });
      }
    }

    // Sort by similarity score and take top results
    results.sort((a, b) => b.score - a.score);
    const topResults = results.slice(0, limit);

    // Group by document and return best match per document
    const documentMap = new Map<string, typeof topResults[0]>();
    topResults.forEach((result) => {
      if (
        !documentMap.has(result.documentId) ||
        documentMap.get(result.documentId)!.score < result.score
      ) {
        documentMap.set(result.documentId, result);
      }
    });

    const finalResults = Array.from(documentMap.values()).map((result) => ({
      documentId: result.documentId,
      score: result.score,
      snippet: result.text.substring(0, 200) + '...',
    }));

    logger.info('Semantic search completed', { resultsCount: finalResults.length });

    return finalResults;
  } catch (error) {
    logger.error('Semantic search failed', error as Error);
    throw new Error('Failed to perform semantic search');
  }
}

/**
 * Find similar documents to a given document
 */
export async function findSimilarDocuments(
  documentId: string,
  userId: string,
  limit = 5
): Promise<Array<{ documentId: string; score: number }>> {
  try {
    logger.info('Finding similar documents', { documentId, userId, limit });

    const sourceDoc = await DocumentModel.findOne({ _id: documentId, userId });

    if (!sourceDoc || !sourceDoc.embeddings || sourceDoc.embeddings.length === 0) {
      throw new Error('Source document not found or has no embeddings');
    }

    // Use the first embedding as representative
    const sourceEmbedding = sourceDoc.embeddings[0].vector;

    // Get all other documents
    const documents = await DocumentModel.find({
      userId,
      _id: { $ne: documentId },
      'embeddings.0': { $exists: true },
    }).select('_id embeddings');

    const similarities: Array<{ documentId: string; score: number }> = [];

    for (const doc of documents) {
      if (!doc.embeddings || doc.embeddings.length === 0) continue;

      // Calculate average similarity across all chunks
      const scores = doc.embeddings.map((emb) =>
        cosineSimilarity(sourceEmbedding, emb.vector)
      );
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

      similarities.push({
        documentId: doc._id.toString(),
        score: avgScore,
      });
    }

    similarities.sort((a, b) => b.score - a.score);
    const results = similarities.slice(0, limit);

    logger.info('Similar documents found', { count: results.length });

    return results;
  } catch (error) {
    logger.error('Finding similar documents failed', error as Error);
    throw new Error('Failed to find similar documents');
  }
}

/**
 * Retrieve relevant chunks for RAG
 */
export async function retrieveRelevantChunks(
  query: string,
  documentId: string,
  topK = 3
): Promise<string[]> {
  try {
    logger.info('Retrieving relevant chunks', { query, documentId, topK });

    // Generate embedding for the query
    const [queryEmbedding] = await generateEmbeddings([query]);

    // Get document embeddings
    const document = await DocumentModel.findById(documentId).select('embeddings');

    if (!document || !document.embeddings || document.embeddings.length === 0) {
      throw new Error('Document not found or has no embeddings');
    }

    // Calculate similarity for each chunk
    const chunkScores = document.embeddings.map((embedding, index) => ({
      index,
      score: cosineSimilarity(queryEmbedding, embedding.vector),
      text: embedding.text,
    }));

    // Sort by score and get top K
    chunkScores.sort((a, b) => b.score - a.score);
    const topChunks = chunkScores.slice(0, topK).map((chunk) => chunk.text);

    logger.info('Relevant chunks retrieved', { count: topChunks.length });

    return topChunks;
  } catch (error) {
    logger.error('Retrieving relevant chunks failed', error as Error);
    throw new Error('Failed to retrieve relevant chunks');
  }
}

/**
 * Store embeddings for a document
 */
export async function storeEmbeddings(
  documentId: string,
  chunks: string[],
  vectors: number[][]
): Promise<void> {
  try {
    logger.info('Storing embeddings', { documentId, count: vectors.length });

    const embeddings: Embedding[] = vectors.map((vector, index) => ({
      vector,
      model: 'text-embedding-3-small',
      chunkIndex: index,
      text: chunks[index],
    }));

    await DocumentModel.findByIdAndUpdate(documentId, {
      embeddings,
    });

    logger.info('Embeddings stored successfully', { documentId });
  } catch (error) {
    logger.error('Storing embeddings failed', error as Error);
    throw new Error('Failed to store embeddings');
  }
}
