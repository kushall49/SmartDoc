/**
 * Document Comparison Service
 * AI-powered intelligent diff between two documents.
 * Not just text diff - SEMANTIC diff:
 * - What changed in meaning (not just wording)
 * - Detected clause removals in contracts
 * - New obligations or risks introduced
 * - Financial amount changes
 * - Date/deadline changes
 * 
 * This is enterprise-grade and doesn't exist in basic document apps.
 */

import openai, { OPENAI_CONFIG } from '@/lib/openai';
import anthropic, { CLAUDE_CONFIG } from '@/lib/claude';
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
 * Semantically compare two documents using Claude (better for long docs)
 * Not just word diff - understands meaning, context, and legal implications
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
    // Use Claude for document comparison (superior at long-context understanding)
    const response = await anthropic.messages.create({
      model: CLAUDE_CONFIG.model,
      max_tokens: 3000,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '{}';
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content);

    const riskCounts = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const change of parsed.semanticChanges || []) {
      riskCounts[change.riskLevel as keyof typeof riskCounts]++;
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

/**
 * Quick similarity check between two texts (lightweight)
 */
export async function quickSimilarityCheck(textA: string, textB: string): Promise<number> {
  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_CONFIG.fallbackModel, // Use cheap model for simple task
      messages: [
        {
          role: 'user',
          content: `Rate the semantic similarity of these two texts from 0-100.
Return ONLY a number.

Text A: ${textA.substring(0, 2000)}
Text B: ${textB.substring(0, 2000)}`,
        },
      ],
      max_tokens: 5,
      temperature: 0,
    });

    const score = parseInt(response.choices[0]?.message?.content?.trim() || '0');
    return isNaN(score) ? 0 : Math.min(100, Math.max(0, score));
  } catch {
    return 0;
  }
}
