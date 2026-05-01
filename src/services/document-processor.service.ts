import { connectDB } from '@/lib/db';
import { DocumentModel } from '@/models/Document';
import { Embedding } from '@/models/Embedding';
import { getFileBuffer } from '@/services/s3.service';
import { extractText } from '@/services/ocr.service';
import { runAI } from '@/services/model-router.service';
import { chunkText, generateEmbeddings } from '@/services/embedding.service';
import { logger } from '@/lib/logger';
import mongoose from 'mongoose';

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

export async function processDocument(documentId: string): Promise<void> {
  await connectDB();

  const doc = await DocumentModel.findById(documentId);
  if (!doc) throw new Error(`Document ${documentId} not found`);

  logger.info('Processing document', { documentId, name: doc.name });

  await DocumentModel.updateOne(
    { _id: documentId },
    {
      status: 'processing',
      processingStartedAt: new Date(),
      errorMessage: undefined,
    }
  );

  try {
    // Step 1: Get file and extract text
    logger.info('Step 1: Fetching file and extracting text', { documentId });
    const buffer = await getFileBuffer(doc.s3Key);
    const ocrResult = await extractText(buffer, doc.mimeType);

    if (!ocrResult.text || ocrResult.text.trim().length < 10) {
      throw new Error(
        'Could not extract readable text from document. Please ensure the document is not empty or corrupted.'
      );
    }

    // Step 2: AI Analysis (summarize + extract + classify + anomaly detection)
    logger.info('Step 2: Running AI analysis', { documentId });

    // Truncate text to stay within token limits
    const analysisText = ocrResult.text.slice(0, 15000);

    const deriveDocTypeFromMime = (mimeType: string): string => {
      if (mimeType === 'application/pdf') return 'report';
      if (mimeType.includes('wordprocessingml')) return 'report';
      if (mimeType.startsWith('image/')) return 'image';
      return 'other';
    };

    let analysisResult: {
      content: string;
      provider: 'openai' | 'anthropic' | 'groq';
      model: string;
      inputTokens: number;
      outputTokens: number;
    };

    try {
      analysisResult = await runAI(
        'extract',
        ANALYSIS_SYSTEM,
        `Document text (${ocrResult.text.length} total chars):\n\n${analysisText}`,
        {
          userId: doc.userId instanceof mongoose.Types.ObjectId
            ? doc.userId
            : new mongoose.Types.ObjectId(doc.userId as string),
          documentId: doc._id instanceof mongoose.Types.ObjectId
            ? doc._id
            : new mongoose.Types.ObjectId(doc._id as string),
          maxTokens: 2000,
        }
      );
    } catch (aiError) {
      logger.warn('AI analysis unavailable, using local fallback analysis', {
        documentId,
        error: String(aiError),
      });
      analysisResult = {
        content: JSON.stringify({
          documentType: deriveDocTypeFromMime(doc.mimeType),
          summary: ocrResult.text.slice(0, 500).replace(/\s+/g, ' ').trim(),
          entities: [],
          keywords: [],
          anomalies: [],
          language: ocrResult.language ?? 'en',
        }),
        provider: 'openai',
        model: 'local-fallback',
        inputTokens: 0,
        outputTokens: 0,
      };
    }

    // Parse AI response
    let analysis: {
      documentType: string;
      summary: string;
      entities: Array<{ type: string; value: string; confidence: number }>;
      keywords: string[];
      anomalies: string[];
      language: string;
    };

    try {
      // Strip markdown fences if present
      const cleaned = analysisResult.content
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
      analysis = JSON.parse(cleaned);
    } catch {
      logger.warn('AI returned invalid JSON, using fallback analysis', { documentId });
      analysis = {
        documentType: 'other',
        summary: analysisResult.content.slice(0, 500).replace(/\n/g, ' '),
        entities: [],
        keywords: [],
        anomalies: [],
        language: ocrResult.language ?? 'en',
      };
    }

    // Step 3: Generate embeddings
    logger.info('Step 3: Generating embeddings', { documentId });
    const chunks = chunkText(ocrResult.text, 600, 80);

    if (chunks.length > 0) {
      try {
        const vectors = await generateEmbeddings(chunks.map((c) => c.text));

        // Remove old embeddings (in case of reprocessing)
        await Embedding.deleteMany({ documentId: doc._id });

        const embeddingDocs = chunks.map((chunk, i) => ({
          documentId: doc._id,
          userId: doc.userId,
          chunkIndex: i,
          chunkText: chunk.text,
          chunkTokens: chunk.tokenEstimate,
          pageNumber: chunk.page,
          embedding: vectors[i],
        }));

        await Embedding.insertMany(embeddingDocs, { ordered: false });
        logger.info('Embeddings stored', { documentId, count: embeddingDocs.length });
      } catch (embeddingError) {
        logger.warn('Embedding generation unavailable, skipping semantic index', {
          documentId,
          error: String(embeddingError),
        });
      }
    }

    // Step 4: Save all results
    const validDocTypes = [
      'invoice', 'contract', 'resume', 'report', 'image', 'legal', 'other',
    ];
    const docType = validDocTypes.includes(analysis.documentType)
      ? analysis.documentType
      : 'other';

    await DocumentModel.updateOne(
      { _id: documentId },
      {
        status: 'ready',
        rawText: ocrResult.text,
        extractedText: ocrResult.text, // Legacy field
        pageCount: ocrResult.pageCount,
        language: analysis.language ?? ocrResult.language ?? 'en',
        documentType: docType,
        summary: analysis.summary ?? '',
        entities: (analysis.entities ?? []).map((e) => ({
          type: e.type ?? 'other',
          value: e.value ?? '',
          confidence: typeof e.confidence === 'number' ? e.confidence : 0.8,
        })),
        keywords: analysis.keywords ?? [],
        anomalies: analysis.anomalies ?? [],
        tokensUsed:
          (analysisResult.inputTokens ?? 0) + (analysisResult.outputTokens ?? 0),
        aiProvider: analysisResult.provider,
        aiModel: analysisResult.model,
        processingCompletedAt: new Date(),
        errorMessage: undefined,
      }
    );

    logger.info('Document processing complete', {
      documentId,
      docType,
      chunks: chunks.length,
      entities: (analysis.entities ?? []).length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Document processing failed', { documentId, error: message });

    await DocumentModel.updateOne(
      { _id: documentId },
      {
        status: 'failed',
        errorMessage: message,
      }
    );

    throw error;
  }
}
