import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { DocumentModel } from '@/models/Document';
import { runAI } from '@/services/model-router.service';
import { ok, err, unauthorized, notFound, serverError } from '@/lib/api-response';
import { z } from 'zod';
import mongoose from 'mongoose';

const schema = z.object({
  documentId1: z.string().min(1),
  documentId2: z.string().min(1),
});

const COMPARE_SYSTEM = `You are a document comparison expert. Compare the two documents and return a JSON object:
{
  "similarity": 75,
  "documentType": "contract",
  "summary": "Overall comparison summary",
  "keyDifferences": ["difference 1", "difference 2"],
  "addedContent": ["content added in document 2"],
  "removedContent": ["content removed from document 2"],
  "semanticChanges": [
    { "section": "section name", "change": "description", "risk": "low|medium|high" }
  ],
  "recommendation": "Brief recommendation"
}
Return ONLY valid JSON.`;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function buildLocalComparison(text1: string, text2: string, name1: string, name2: string) {
  const tokens1 = new Set(tokenize(text1));
  const tokens2 = new Set(tokenize(text2));
  const common = [...tokens1].filter((t) => tokens2.has(t)).length;
  const total = new Set([...tokens1, ...tokens2]).size || 1;
  const similarity = Math.max(1, Math.min(99, Math.round((common / total) * 100)));

  const lines1 = text1.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const lines2 = text2.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const set1 = new Set(lines1);
  const set2 = new Set(lines2);

  const addedContent = lines2.filter((l) => !set1.has(l)).slice(0, 5);
  const removedContent = lines1.filter((l) => !set2.has(l)).slice(0, 5);

  const keyDifferences = [
    ...(addedContent.length > 0
      ? [`${name2} includes ${addedContent.length} notable lines not present in ${name1}.`]
      : []),
    ...(removedContent.length > 0
      ? [`${name1} includes ${removedContent.length} notable lines not present in ${name2}.`]
      : []),
  ];

  return {
    similarity,
    documentType: 'report',
    summary:
      `Local comparison generated without external AI. ${name1} and ${name2} are approximately ${similarity}% similar based on textual overlap.`,
    keyDifferences:
      keyDifferences.length > 0
        ? keyDifferences
        : ['No major line-level differences detected with local fallback analysis.'],
    addedContent,
    removedContent,
    semanticChanges: [],
    recommendation:
      'For deeper semantic reasoning, re-enable a valid AI provider key. This local mode keeps comparison available without external API dependency.',
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorized();

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success)
      return err(parsed.error.issues[0]?.message ?? 'Invalid request');

    const { documentId1, documentId2 } = parsed.data;
    if (documentId1 === documentId2) return err('Cannot compare a document with itself');

    await connectDB();

    const userId = new mongoose.Types.ObjectId(session.user.id);

    const [doc1, doc2] = await Promise.all([
      DocumentModel.findOne({ _id: documentId1, userId }).select('+rawText +extractedText').lean(),
      DocumentModel.findOne({ _id: documentId2, userId }).select('+rawText +extractedText').lean(),
    ]);

    if (!doc1) return notFound('Document 1');
    if (!doc2) return notFound('Document 2');

    const text1 = (doc1.rawText || doc1.extractedText || doc1.summary || '').slice(0, 20000);
    const text2 = (doc2.rawText || doc2.extractedText || doc2.summary || '').slice(0, 20000);

    if (!text1 && !text2)
      return err('Both documents must be processed before comparing');

    const userPrompt = `DOCUMENT 1 (${doc1.name}):\n${text1 || 'No text available'}\n\n=====\n\nDOCUMENT 2 (${doc2.name}):\n${text2 || 'No text available'}`;

    let result;
    try {
      result = await runAI('compare', COMPARE_SYSTEM, userPrompt, {
        userId,
        maxTokens: 2000,
        forceProvider: 'groq',
        forceModel: 'llama-3.3-70b-versatile',
      });
    } catch (aiError) {
      const localComparison = buildLocalComparison(text1, text2, doc1.name, doc2.name);
      return ok({
        comparison: localComparison,
        documents: [
          { id: documentId1, name: doc1.name, type: doc1.documentType },
          { id: documentId2, name: doc2.name, type: doc2.documentType },
        ],
        provider: 'local-fallback',
        model: 'heuristic-compare-v1',
        tokensUsed: 0,
        warning: `AI provider unavailable (${String(aiError)}). Returned local fallback comparison.`,
      });
    }

    let comparison: Record<string, unknown>;
    try {
      const cleaned = result.content
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
      comparison = JSON.parse(cleaned);
    } catch {
      comparison = {
        similarity: 0,
        summary: result.content.slice(0, 500),
        keyDifferences: [],
        addedContent: [],
        removedContent: [],
        semanticChanges: [],
        recommendation: '',
      };
    }

    return ok({
      comparison,
      documents: [
        { id: documentId1, name: doc1.name, type: doc1.documentType },
        { id: documentId2, name: doc2.name, type: doc2.documentType },
      ],
      provider: result.provider,
      model: result.model,
      tokensUsed: result.inputTokens + result.outputTokens,
    });
  } catch (e) {
    return serverError(e);
  }
}
