/**
 * Cross-Document Intelligence Service
 * Finds patterns, contradictions & insights across ALL user documents.
 * 
 * Real-world use cases:
 * - "Do any contracts have conflicting termination dates?"
 * - "Which invoices are missing from this vendor?"
 * - "Have my contract terms changed between 2024 and 2025?"
 * - "Find all documents mentioning John Smith"
 * - "Are there any duplicate clauses across my agreements?"
 * 
 * THIS is what sets this app apart from basic document viewers.
 */

import { runAI } from '@/services/model-router.service';
import openai from '@/lib/openai';
import { cosineSimilarity } from '@/services/embedding.service';
import { DocumentModel } from '@/models/Document';
import { Embedding } from '@/models/Embedding';
import { logger } from '@/lib/logger';
import mongoose from 'mongoose';

export interface CrossDocumentInsight {
  type: 'contradiction' | 'pattern' | 'missing' | 'duplicate' | 'trend' | 'risk';
  title: string;
  description: string;
  affectedDocuments: Array<{ id: string; name: string; relevantText: string }>;
  severity: 'info' | 'warning' | 'critical';
  recommendation: string;
}

export interface EntityTimeline {
  entity: string;
  entityType: string;
  appearances: Array<{
    documentId: string;
    documentName: string;
    context: string;
    date: Date;
  }>;
}

export interface CrossDocumentReport {
  query: string;
  documentsAnalyzed: number;
  insights: CrossDocumentInsight[];
  entityTimelines: EntityTimeline[];
  relatedDocumentClusters: Array<{
    theme: string;
    documents: Array<{ id: string; name: string }>;
  }>;
  generatedAt: Date;
}

/**
 * Analyze ALL user documents for cross-cutting patterns and insights
 * This is the "intelligence layer" that turns a document archive into knowledge
 */
export async function analyzeAcrossDocuments(
  userId: string,
  intelligenceQuery: string
): Promise<CrossDocumentReport> {
  logger.info('Starting cross-document intelligence', { userId, query: intelligenceQuery });

  const documents = await DocumentModel.find({
    userId,
    status: 'ready',
  })
    .select('_id originalName name summary entities documentType createdAt')
    .limit(50); // Analyze up to 50 docs

  if (documents.length === 0) {
    throw new Error('No processed documents found');
  }

  // Build a compact knowledge base from all documents
  const docSummaries = documents.map((doc) => ({
    id: doc._id.toString(),
    name: doc.name || doc.originalName,
    type: doc.documentType || 'unknown',
    summary: doc.summary || '',
    entities: (doc.entities || []).slice(0, 10),
    createdAt: doc.createdAt,
  }));

  const knowledgeBase = docSummaries
    .map(
      (d) =>
        `[DOC_ID: ${d.id}] [NAME: ${d.name}] [TYPE: ${d.type}]\n` +
        `Summary: ${d.summary}\n` +
        `Entities: ${d.entities.map((e: { type: string; value: string }) => `${e.type}: ${e.value}`).join(', ')}`
    )
    .join('\n\n---\n\n');

  const systemPrompt = `You are an expert document intelligence analyst. You have access to ${documents.length} documents.
Perform deep cross-document analysis. Find:
1. Contradictions between documents
2. Recurring patterns or themes
3. Potential risks (expired dates, conflicting terms)
4. Missing documents (e.g., referenced but not found)
5. Entity timelines (how entities appear across time)
6. Duplicate or near-duplicate content

Return valid JSON:
{
  "insights": [
    {
      "type": "contradiction|pattern|missing|duplicate|trend|risk",
      "title": "...",
      "description": "...",
      "affectedDocuments": [{"id": "...", "name": "...", "relevantText": "..."}],
      "severity": "info|warning|critical",
      "recommendation": "..."
    }
  ],
  "entityTimelines": [
    {
      "entity": "...",
      "entityType": "person|org|date|money",
      "appearances": [{"documentId": "...", "documentName": "...", "context": "..."}]
    }
  ],
  "relatedDocumentClusters": [
    {
      "theme": "...",
      "documents": [{"id": "...", "name": "..."}]
    }
  ]
}`;

  const userPrompt = `User Query: "${intelligenceQuery}"

Document Knowledge Base:
${knowledgeBase.substring(0, 12000)}`;

  try {
    const result = await runAI('intelligence', systemPrompt, userPrompt, {
      userId: new mongoose.Types.ObjectId(userId),
      maxTokens: 4000,
      forceProvider: 'groq',
      forceModel: 'llama-3.3-70b-versatile',
    });

    let parsed: Record<string, unknown>;
    try {
      // Better JSON extraction to avoid markdown wrapper issues
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      const cleaned = jsonMatch ? jsonMatch[0] : result.content;
      parsed = JSON.parse(cleaned);
    } catch {
      logger.warn('Failed to parse intelligence JSON', { content: result.content });
      parsed = { insights: [], entityTimelines: [], relatedDocumentClusters: [] };
    }

    return {
      query: intelligenceQuery,
      documentsAnalyzed: documents.length,
      insights: (parsed.insights as CrossDocumentInsight[]) || [],
      entityTimelines: (parsed.entityTimelines as EntityTimeline[]) || [],
      relatedDocumentClusters: (parsed.relatedDocumentClusters as CrossDocumentReport['relatedDocumentClusters']) || [],
      generatedAt: new Date(),
    };
  } catch (error) {
    logger.warn('Cross-document AI unavailable, using local fallback', {
      error: String(error),
      userId,
    });

    const topEntities = docSummaries
      .flatMap((d) => d.entities.map((e: { type: string; value: string }) => `${e.type}:${e.value}`))
      .slice(0, 20);

    const duplicateEntityHints = [...new Set(topEntities)]
      .filter((entry) => topEntities.filter((e) => e === entry).length > 1)
      .slice(0, 5);

    const localInsights: CrossDocumentInsight[] = [
      {
        type: 'pattern',
        title: 'Local pattern scan completed',
        description:
          `AI provider was unavailable, so SmartDoc used local analysis across ${documents.length} documents.`,
        affectedDocuments: docSummaries.slice(0, 5).map((d) => ({
          id: d.id,
          name: d.name,
          relevantText: d.summary.slice(0, 180),
        })),
        severity: 'info',
        recommendation:
          'Local mode is active and functional. Add a valid AI key to enable deeper semantic intelligence.',
      },
      ...(duplicateEntityHints.length > 0
        ? [{
            type: 'duplicate' as const,
            title: 'Repeated entities detected',
            description: `Found repeated entity hints: ${duplicateEntityHints.join(', ')}`,
            affectedDocuments: docSummaries.slice(0, 5).map((d) => ({
              id: d.id,
              name: d.name,
              relevantText: (d.summary || '').slice(0, 160),
            })),
            severity: 'warning' as const,
            recommendation: 'Review repeated entities for potential duplicates or cross-document links.',
          }]
        : []),
    ];

    return {
      query: intelligenceQuery,
      documentsAnalyzed: documents.length,
      insights: localInsights,
      entityTimelines: [],
      relatedDocumentClusters: [],
      generatedAt: new Date(),
    };
  }
}

/**
 * Find semantically similar documents using vector embeddings
 * Groups documents by topic using clustering
 */
export async function clusterDocumentsByTopic(
  userId: string
): Promise<Array<{ theme: string; documents: Array<{ id: string; name: string; score: number }> }>> {
  logger.info('Clustering documents by topic using Groq', { userId });

  // Get all ready documents
  const documents = await DocumentModel.find({
    userId,
    status: 'ready',
  }).select('_id name originalName summary');

  if (documents.length < 2) return [];

  // Fallback to Groq for clustering since embeddings might be missing due to rate limits
  const docList = documents.map(d => `ID: ${d._id}\nName: ${d.name || d.originalName}\nSummary: ${d.summary || 'No summary available.'}`).join('\n\n');

  try {
    const response = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are an AI that clusters documents into meaningful thematic topics. Group the provided documents into 2-5 clusters based on their contents and summaries. Return ONLY a valid JSON object strictly matching this format: {"clusters": [{"theme": "Theme Name", "documents": [{"id": "doc_id", "name": "doc_name", "score": 1.0}]}]}. Do not include markdown formatting or extra text.'
        },
        {
          role: 'user',
          content: `Cluster these documents:\n\n${docList}`
        }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });

    let resultText = response.choices[0].message.content || '{"clusters": []}';
    
    // Clean up Markdown formatting from Groq
    resultText = resultText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    
    // Attempt parsing or fallback
    let parsed;
    try {
      parsed = JSON.parse(resultText);
    } catch {
      // If Groq outputs invalid JSON, regex match the clusters object
      const match = resultText.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { clusters: [] };
    }
    
    return parsed.clusters || [];
  } catch (error) {
    logger.error('Failed to cluster documents using Groq', { error: String(error) });
    return [];
  }
}

/**
 * Track how a specific entity (person, org, amount) appears across documents over time
 */
export async function trackEntityAcrossDocuments(
  userId: string,
  entityValue: string
): Promise<EntityTimeline> {
  const documents = await DocumentModel.find({
    userId,
    status: 'ready',
    $or: [
      { 'entities.value': { $regex: entityValue, $options: 'i' } },
      { extractedText: { $regex: entityValue, $options: 'i' } },
      { rawText: { $regex: entityValue, $options: 'i' } }
    ]
  })
    .select('+rawText +extractedText _id originalName name entities createdAt documentType')
    .sort({ createdAt: 1 });

  const appearances = documents.map((doc) => {
    const matchedEntity = doc.entities?.find((e: { value: string }) =>
      e.value.toLowerCase().includes(entityValue.toLowerCase())
    );

    // Find surrounding context in rawText/extractedText
    const text = doc.rawText || doc.extractedText || '';
    const textIndex = text.toLowerCase().indexOf(entityValue.toLowerCase());
    const context = textIndex >= 0
      ? text.substring(Math.max(0, textIndex - 100), textIndex + 200)
      : matchedEntity?.value || '';

    return {
      documentId: doc._id.toString(),
      documentName: doc.name || doc.originalName,
      context: context.trim(),
      date: doc.createdAt,
    };
  });

  return {
    entity: entityValue,
    entityType: 'unknown',
    appearances,
  };
}
