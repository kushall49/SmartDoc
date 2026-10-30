/**
 * Document Comparison Service
 * AI-powered intelligent semantic diff between two documents using OpenAI.
 */

import openai, { OPENAI_CONFIG } from '@/lib/openai';
import { logger } from '@/lib/logger';

export interface TextDiff {
  type: 'added' | 'removed' | 'changed' | 'unchanged';
  oldText?: string;
  newText?: string;
  semanticMeaning?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

export interface SemanticChange {
  category: 'financial' | 'legal' | 'dates' | 'parties' | 'obligations' | 'termination' | 'general';
  description: string;
  oldValue?: string;
  newValue?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
}

export interface ComparisonResult {
  documentA: { id: string; name: string };
  documentB: { id: string; name: string };
  overallSimilarity: number; // 0-100
  semanticChanges: SemanticChange[];
  riskSummary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    overallRisk: 'low' | 'medium' | 'high' | 'critical';
  };
  keyDifferences: string[];
  addedContent: string[];
  removedContent: string[];
  recommendation: string;
  comparedAt: Date;
}

/**
 * Semantically compare two documents using OpenAI GPT-4o
 */
export async function compareDocuments(
  textA: string,
  textB: string,
  docAInfo: { id: string; name: string },
  docBInfo: { id: string; name: string },
  documentType?: string
): Promise<ComparisonResult> {
  logger.info('Starting document comparison', {
    docA: docAInfo.name,
    docB: docBInfo.name,
    typeHint: documentType,
  });

  const truncatedA = textA.substring(0, 8000);
  const truncatedB = textB.substring(0, 8000);

  const prompt = `You are a senior legal and business document analyst. Compare these two versions of a ${documentType || 'document'} and identify ALL meaningful differences.

=== DOCUMENT A (Original): ${docAInfo.name} ===
${truncatedA}

=== DOCUMENT B (Revised): ${docBInfo.name} ===
${truncatedB}

Perform a DEEP SEMANTIC analysis. Return valid JSON with this exact structure:
{
  "overallSimilarity": <0-100>,
  "semanticChanges": [
    {
      "category": "financial|legal|dates|parties|obligations|termination|general",
      "description": "...",
      "oldValue": "...",
      "newValue": "...", 
      "riskLevel": "low|medium|high|critical",
      "recommendation": "..."
    }
  ],
  "keyDifferences": ["list of top-5 most important differences"],
  "addedContent": ["new clauses or content only in B"],
  "removedContent": ["content only in A that was removed"],
  "overallRisk": "low|medium|high|critical",
  "recommendation": "overall recommendation for the reviewer"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_CONFIG.model,
      temperature: 0.2,
      max_tokens: 3000,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are an expert document analyst that outputs structured JSON comparison results.',
        },
        { role: 'user', content: prompt },
      ],
    });

    const content = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    const riskCounts = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const change of parsed.semanticChanges || []) {
      const riskKey = change.riskLevel as keyof typeof riskCounts;
      if (riskCounts[riskKey] !== undefined) {
        riskCounts[riskKey]++;
      }
    }

    return {
      documentA: docAInfo,
      documentB: docBInfo,
      overallSimilarity: parsed.overallSimilarity || 0,
      semanticChanges: parsed.semanticChanges || [],
      riskSummary: {
        ...riskCounts,
        overallRisk: parsed.overallRisk || 'low',
      },
      keyDifferences: parsed.keyDifferences || [],
      addedContent: parsed.addedContent || [],
      removedContent: parsed.removedContent || [],
      recommendation: parsed.recommendation || '',
      comparedAt: new Date(),
    };
  } catch (error) {
    logger.error('Document comparison failed', error as Error);
    throw new Error('Failed to compare documents');
  }
}
