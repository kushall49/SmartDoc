import { prisma } from '@/lib/db';
import { readFile } from '@/services/storage.service';
import { extractText } from '@/services/ocr.service';
import { runAI } from '@/services/openai.service';
import { chunkText, generateEmbeddings } from '@/services/embedding.service';
import { storeDocumentChunks } from '@/services/vector-search.service';
import { logger } from '@/lib/logger';

const ANALYSIS_SYSTEM = `You are a document analysis expert. Analyze the document text and return a JSON object with EXACTLY these fields:
{
  "documentType": "invoice" | "contract" | "resume" | "report" | "image" | "legal" | "other",
  "summary": "2-3 sentence executive summary of the document",
  "entities": [
    { "type": "person|date|amount|organization|location|id|email|phone", "value": "string", "confidence": 0.95 }
  ],
  "keywords": ["keyword1", "keyword2"],
  "anomalies": ["description of any suspicious, missing, or inconsistent information"],
  "language": "en"
}
Return ONLY valid JSON. No markdown, no code fences, no explanation outside the JSON.`;

/**
 * Intelligent local extraction when OpenAI quota is unavailable.
 */
function extractDocumentHeuristics(text: string, docName: string) {
  const tLower = text.toLowerCase();

  // 1. Detect document type
  let documentType = 'report';
  if (
    tLower.includes('agreement') ||
    tLower.includes('contract') ||
    tLower.includes('nondisclosure') ||
    tLower.includes('nda') ||
    tLower.includes('terms and conditions') ||
    tLower.includes('parties hereto')
  ) {
    documentType = 'contract';
  } else if (
    tLower.includes('invoice') ||
    tLower.includes('bill to') ||
    tLower.includes('amount due') ||
    tLower.includes('subtotal')
  ) {
    documentType = 'invoice';
  } else if (
    tLower.includes('curriculum vitae') ||
    tLower.includes('resume') ||
    tLower.includes('work experience')
  ) {
    documentType = 'resume';
  } else if (
    tLower.includes('court') ||
    tLower.includes('plaintiff') ||
    tLower.includes('defendant') ||
    tLower.includes('statute')
  ) {
    documentType = 'legal';
  }

  // 2. Extract clean sentences for executive summary
  const cleanLines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 20 && !l.startsWith('---'));

  const leadSentences = cleanLines.slice(0, 4).join(' ');
  const summary =
    leadSentences.length > 30
      ? leadSentences.slice(0, 500)
      : `Executive document record for ${docName}. Contains structured contractual, transactional, or analytical terms.`;

  // 3. Extract entities (Dates, amounts, organizations, emails)
  const entities: Array<{ type: string; value: string; confidence: number }> = [];

  // Dates
  const dateMatches = text.match(/\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4})\b/gi) || [];
  for (const d of Array.from(new Set(dateMatches)).slice(0, 5)) {
    entities.push({ type: 'date', value: d, confidence: 0.95 });
  }

  // Currency amounts
  const amountMatches = text.match(/\$[\d,]+(?:\.\d{2})?/g) || [];
  for (const a of Array.from(new Set(amountMatches)).slice(0, 5)) {
    entities.push({ type: 'amount', value: a, confidence: 0.95 });
  }

  // Emails
  const emailMatches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  for (const e of Array.from(new Set(emailMatches)).slice(0, 4)) {
    entities.push({ type: 'email', value: e, confidence: 0.98 });
  }

  // Organizations
  const orgMatches = text.match(/\b[A-Z][a-zA-Z0-9&., ]{2,30}(?:Inc|LLC|Corp|Corporation|Ltd|Company|Group)\b/g) || [];
  for (const o of Array.from(new Set(orgMatches)).slice(0, 5)) {
    entities.push({ type: 'organization', value: o.trim(), confidence: 0.9 });
  }

  // 4. Extract keywords
  const words = text
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((w) => w.toLowerCase())
    .filter(
      (w) =>
        w.length > 4 &&
        !['their', 'there', 'which', 'about', 'shall', 'where', 'these', 'under', 'other', 'after'].includes(w)
    );

  const freq: Record<string, number> = {};
  for (const w of words) {
    freq[w] = (freq[w] || 0) + 1;
  }
  const keywords = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([w]) => w);

  return {
    documentType,
    summary,
    entities,
    keywords,
    anomalies: [] as string[],
    language: 'en',
  };
}

/**
 * End-to-end processing pipeline for an uploaded document:
 * Extract text -> AI Analysis -> Chunk -> Embed -> Store in pgvector -> Mark Ready.
 */
export async function processDocument(documentId: string): Promise<void> {
  // 1. Fetch document from PostgreSQL
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
  });

  if (!doc) {
    throw new Error(`Document ${documentId} not found in PostgreSQL.`);
  }

  logger.info('Processing document pipeline started', {
    documentId,
    name: doc.name,
    filePath: doc.filePath,
  });

  // 2. Mark status as 'processing'
  await prisma.document.update({
    where: { id: documentId },
    data: {
      status: 'processing',
      processingStartedAt: new Date(),
    },
  });

  try {
    // Step 1: Read local file buffer and extract text (pdf-parse / mammoth / tesseract.js / text)
    logger.info('Step 1: Reading local file and extracting text', { documentId });
    const buffer = await readFile(doc.filePath);
    const ocrResult = await extractText(buffer, doc.mimeType);

    if (!ocrResult.text || ocrResult.text.trim().length < 5) {
      throw new Error(
        'Could not extract readable text from document. Ensure file is not empty or corrupted.'
      );
    }

    // Step 2: AI Analysis with OpenAI gpt-4o-mini (with heuristic fallback)
    logger.info('Step 2: Running document structured analysis', { documentId });
    const analysisText = ocrResult.text.slice(0, 15000);

    let analysis = extractDocumentHeuristics(ocrResult.text, doc.name);
    let totalTokensUsed = 0;

    try {
      const aiResult = await runAI(
        'extract',
        ANALYSIS_SYSTEM,
        `Document text (${ocrResult.text.length} total chars):\n\n${analysisText}`,
        {
          userId: doc.userId,
          documentId: doc.id,
          maxTokens: 2000,
          responseFormat: 'json_object',
        }
      );

      totalTokensUsed = aiResult.totalTokens;
      const parsed = JSON.parse(aiResult.content);

      analysis = {
        documentType: parsed.documentType ?? analysis.documentType,
        summary: parsed.summary ?? analysis.summary,
        entities: Array.isArray(parsed.entities) && parsed.entities.length > 0 ? parsed.entities : analysis.entities,
        keywords: Array.isArray(parsed.keywords) && parsed.keywords.length > 0 ? parsed.keywords : analysis.keywords,
        anomalies: Array.isArray(parsed.anomalies) ? parsed.anomalies : [],
        language: parsed.language ?? ocrResult.language ?? 'en',
      };
    } catch (aiErr) {
      logger.warn('AI analysis skipped/failed (using heuristic extraction)', {
        error: String(aiErr),
        documentId,
      });
    }

    // Step 3: Sentence-boundary chunking (600 tokens, 80 overlap)
    logger.info('Step 3: Chunking document text', { documentId });
    const chunks = chunkText(ocrResult.text, 600, 80);

    // Step 4: Generate embeddings (1536-d) & store in PostgreSQL pgvector
    if (chunks.length > 0) {
      logger.info('Step 4: Generating embeddings and storing in pgvector', {
        documentId,
        chunkCount: chunks.length,
      });

      const vectors = await generateEmbeddings(chunks.map((c) => c.text));

      const chunkInputs = chunks.map((c, idx) => ({
        chunkIndex: idx,
        chunkText: c.text,
        chunkTokens: c.tokenEstimate,
        pageNumber: c.page,
        embedding: vectors[idx],
      }));

      await storeDocumentChunks(doc.id, doc.userId, chunkInputs);
    }

    // Step 5: Update document in PostgreSQL to 'ready'
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'ready',
        rawText: ocrResult.text,
        pageCount: ocrResult.pageCount ?? 1,
        documentType: analysis.documentType,
        summary: analysis.summary,
        entities: analysis.entities,
        keywords: analysis.keywords,
        anomalies: analysis.anomalies,
        aiProvider: 'openai',
        tokensUsed: totalTokensUsed,
        processingCompletedAt: new Date(),
      },
    });

    logger.info('Document processing completed successfully', {
      documentId,
      status: 'ready',
      chunks: chunks.length,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Document processing failed', { documentId, error: errorMsg });

    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'failed',
        anomalies: [errorMsg],
        processingCompletedAt: new Date(),
      },
    });

    throw error;
  }
}
