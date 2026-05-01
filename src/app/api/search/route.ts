import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Embedding } from '@/models/Embedding';
import { DocumentModel } from '@/models/Document';
import {
  generateQueryEmbedding,
  cosineSimilarity,
} from '@/services/embedding.service';
import { ok, err, unauthorized, serverError } from '@/lib/api-response';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorized();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = Math.min(20, parseInt(searchParams.get('limit') ?? '10'));

    if (!query || query.trim().length < 2)
      return err('Query must be at least 2 characters');

    await connectDB();

    const userId = new mongoose.Types.ObjectId(session.user.id);
    const queryEmbedding = await generateQueryEmbedding(query);

    const embeddings = await Embedding.find({ userId }).lean();

    if (embeddings.length === 0) {
      return ok({ results: [], total: 0, query });
    }

    const scored = embeddings
      .map((e) => ({
        ...e,
        score: cosineSimilarity(queryEmbedding, e.embedding),
      }))
      .filter((e) => e.score > 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit * 2); // Fetch more then deduplicate per doc

    // Get unique document IDs (best chunk per doc)
    const seenDocs = new Set<string>();
    const topResults = scored.filter((e) => {
      const id = e.documentId.toString();
      if (seenDocs.has(id)) return false;
      seenDocs.add(id);
      return true;
    }).slice(0, limit);

    const docIds = topResults.map((e) => e.documentId);
    const docs = await DocumentModel.find({ _id: { $in: docIds } })
      .select('name documentType status createdAt summary')
      .lean();

    const docsMap = Object.fromEntries(docs.map((d) => [d._id.toString(), d]));

    const results = topResults.map((e) => ({
      documentId: e.documentId.toString(),
      document: docsMap[e.documentId.toString()],
      chunk: e.chunkText,
      page: e.pageNumber,
      score: Math.round(e.score * 100) / 100,
    }));

    return ok({ results, total: results.length, query });
  } catch (e) {
    return serverError(e);
  }
}
