/**
 * Enhanced Multi-Provider AI Service
 * Intelligently routes requests between OpenAI and Claude
 * for optimal performance, cost, and accuracy
 */

import openai, { OPENAI_CONFIG } from '@/lib/openai';
import anthropic, { CLAUDE_CONFIG } from '@/lib/claude';
import { logger } from '@/lib/logger';
import { Entity } from '@/types';
import ModelRouter, { AIProvider } from './model-router.service';

interface AIResponse<T> {
  data: T;
  provider: AIProvider;
  model: string;
  tokens: number;
  cost: number;
  reasoning: string;
}

/**
 * Generate a summary using the optimal AI model
 */
export async function generateSummaryEnhanced(
  text: string,
  documentType?: string,
  maxLength = 500
): Promise<AIResponse<string>> {
  const selection = ModelRouter.selectModel({
    documentLength: text.length,
    taskType: 'summarization',
    documentType,
  });

  logger.info('Generating summary with smart routing', {
    provider: selection.provider,
    model: selection.model,
    reasoning: selection.reasoning,
  });

  try {
    let summary: string;
    let tokens = 0;

    if (selection.provider === 'openai') {
      const response = await openai.chat.completions.create({
        model: selection.model,
        messages: [
          {
            role: 'system',
            content: `You are a professional document analyst. Generate a concise, informative summary of the provided text. The summary should be no more than ${maxLength} characters and capture the key points, main ideas, and important details.`,
          },
          {
            role: 'user',
            content: `Please summarize the following document:\n\n${text.substring(0, 15000)}`,
          },
        ],
        temperature: OPENAI_CONFIG.temperature,
        max_tokens: 500,
      });

      summary = response.choices[0]?.message?.content?.trim() || '';
      tokens = response.usage?.total_tokens || 0;
    } else {
      const response = await anthropic.messages.create({
        model: selection.model,
        max_tokens: 500,
        temperature: CLAUDE_CONFIG.temperature,
        messages: [
          {
            role: 'user',
            content: `You are a professional document analyst. Generate a concise, informative summary of the provided text. The summary should be no more than ${maxLength} characters.\n\nDocument:\n${text.substring(0, 15000)}`,
          },
        ],
      });

      summary = response.content[0].type === 'text' ? response.content[0].text : '';
      tokens = response.usage.input_tokens + response.usage.output_tokens;
    }

    const cost = (tokens / 1_000_000) * selection.estimatedCost;
    ModelRouter.recordUsage(selection.provider, tokens, cost);

    logger.info('Summary generated successfully', {
      provider: selection.provider,
      tokens,
      cost: cost.toFixed(4),
    });

    return {
      data: summary,
      provider: selection.provider,
      model: selection.model,
      tokens,
      cost,
      reasoning: selection.reasoning,
    };
  } catch (error) {
    logger.error('Enhanced summary generation failed', { error: String(error) });
    throw new Error('Failed to generate summary');
  }
}

/**
 * Extract entities using the optimal AI model
 */
export async function extractEntitiesEnhanced(
  text: string,
  documentType?: string
): Promise<AIResponse<Entity[]>> {
  const selection = ModelRouter.selectModel({
    documentLength: text.length,
    taskType: 'entity-extraction',
    documentType,
    requiresAccuracy: true, // Entity extraction needs high accuracy
  });

  logger.info('Extracting entities with smart routing', {
    provider: selection.provider,
    model: selection.model,
  });

  try {
    let entities: Entity[] = [];
    let tokens = 0;

    if (selection.provider === 'openai') {
      const response = await openai.chat.completions.create({
        model: selection.model,
        messages: [
          {
            role: 'system',
            content: `You are an expert in Named Entity Recognition (NER). Extract all important entities from the provided text. For each entity, identify its type (person, organization, location, date, money, email, phone, id, or other) and value. Return the results as a JSON object with an "entities" array.`,
          },
          {
            role: 'user',
            content: `Extract entities from this text:\n\n${text.substring(0, 10000)}`,
          },
        ],
        temperature: OPENAI_CONFIG.temperature,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      const parsed = JSON.parse(content || '{}');
      entities = parsed.entities || [];
      tokens = response.usage?.total_tokens || 0;
    } else {
      const response = await anthropic.messages.create({
        model: selection.model,
        max_tokens: 2000,
        temperature: CLAUDE_CONFIG.temperature,
        messages: [
          {
            role: 'user',
            content: `Extract all important entities from this text. For each entity, identify its type (person, organization, location, date, money, email, phone, id, or other) and value. Return ONLY valid JSON with an "entities" array.\n\nText:\n${text.substring(0, 10000)}`,
          },
        ],
      });

      const content = response.content[0].type === 'text' ? response.content[0].text : '{}';
      const parsed = JSON.parse(content);
      entities = parsed.entities || [];
      tokens = response.usage.input_tokens + response.usage.output_tokens;
    }

    const cost = (tokens / 1_000_000) * selection.estimatedCost;
    ModelRouter.recordUsage(selection.provider, tokens, cost);

    logger.info('Entities extracted successfully', {
      provider: selection.provider,
      count: entities.length,
      tokens,
    });

    return {
      data: entities,
      provider: selection.provider,
      model: selection.model,
      tokens,
      cost,
      reasoning: selection.reasoning,
    };
  } catch (error) {
    logger.error('Enhanced entity extraction failed', { error: String(error) });
    // Fallback to basic extraction
    const entities = extractBasicEntities(text);
    return {
      data: entities,
      provider: 'openai',
      model: 'fallback',
      tokens: 0,
      cost: 0,
      reasoning: 'Fallback to regex-based extraction',
    };
  }
}

/**
 * Classify document using the optimal AI model
 */
export async function classifyDocumentEnhanced(text: string): Promise<AIResponse<string>> {
  const selection = ModelRouter.selectModel({
    documentLength: text.length,
    taskType: 'classification',
  });

  logger.info('Classifying document with smart routing', {
    provider: selection.provider,
  });

  try {
    let classification: string;
    let tokens = 0;

    if (selection.provider === 'openai') {
      const response = await openai.chat.completions.create({
        model: selection.model,
        messages: [
          {
            role: 'system',
            content: `You are a document classification expert. Classify the provided document into one of the following categories: invoice, contract, resume, report, letter, form, receipt, statement, legal, financial, other. Return only the category name in lowercase.`,
          },
          {
            role: 'user',
            content: `Classify this document:\n\n${text.substring(0, 5000)}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 20,
      });

      classification = response.choices[0]?.message?.content?.trim().toLowerCase() || 'other';
      tokens = response.usage?.total_tokens || 0;
    } else {
      const response = await anthropic.messages.create({
        model: selection.model,
        max_tokens: 20,
        temperature: 0.1,
        messages: [
          {
            role: 'user',
            content: `Classify this document into ONE category: invoice, contract, resume, report, letter, form, receipt, statement, legal, financial, or other. Return ONLY the category name.\n\nDocument:\n${text.substring(0, 5000)}`,
          },
        ],
      });

      classification = response.content[0].type === 'text' 
        ? response.content[0].text.trim().toLowerCase() 
        : 'other';
      tokens = response.usage.input_tokens + response.usage.output_tokens;
    }

    const cost = (tokens / 1_000_000) * selection.estimatedCost;
    ModelRouter.recordUsage(selection.provider, tokens, cost);

    return {
      data: classification,
      provider: selection.provider,
      model: selection.model,
      tokens,
      cost,
      reasoning: selection.reasoning,
    };
  } catch (error) {
    logger.error('Enhanced document classification failed', { error: String(error) });
    return {
      data: 'other',
      provider: 'openai',
      model: 'fallback',
      tokens: 0,
      cost: 0,
      reasoning: 'Fallback classification',
    };
  }
}

/**
 * Detect anomalies with high-accuracy models
 */
export async function detectAnomaliesEnhanced(
  text: string,
  documentType?: string
): Promise<AIResponse<{ score: number; details: string }>> {
  const selection = ModelRouter.selectModel({
    documentLength: text.length,
    taskType: 'fraud-detection',
    documentType,
    requiresAccuracy: true, // Fraud detection requires highest accuracy
  });

  logger.info('Detecting anomalies with smart routing', {
    provider: selection.provider,
    model: selection.model,
  });

  try {
    let result: { score: number; details: string };
    let tokens = 0;

    if (selection.provider === 'openai') {
      const response = await openai.chat.completions.create({
        model: selection.model,
        messages: [
          {
            role: 'system',
            content: `You are a fraud detection specialist. Analyze the document for potential anomalies, inconsistencies, suspicious patterns, or red flags. Return a JSON object with "score" (0-100, where 100 is most suspicious) and "details" (brief explanation).`,
          },
          {
            role: 'user',
            content: `Analyze this document for anomalies:\n\n${text.substring(0, 8000)}`,
          },
        ],
        temperature: OPENAI_CONFIG.temperature,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      result = JSON.parse(content || '{"score": 0, "details": "No analysis"}');
      tokens = response.usage?.total_tokens || 0;
    } else {
      const response = await anthropic.messages.create({
        model: selection.model,
        max_tokens: 1000,
        temperature: CLAUDE_CONFIG.temperature,
        messages: [
          {
            role: 'user',
            content: `Analyze this document for potential anomalies, fraud, inconsistencies, or red flags. Return ONLY valid JSON with "score" (0-100) and "details".\n\nDocument:\n${text.substring(0, 8000)}`,
          },
        ],
      });

      const content = response.content[0].type === 'text' ? response.content[0].text : '{}';
      result = JSON.parse(content);
      tokens = response.usage.input_tokens + response.usage.output_tokens;
    }

    const cost = (tokens / 1_000_000) * selection.estimatedCost;
    ModelRouter.recordUsage(selection.provider, tokens, cost);

    logger.info('Anomaly detection completed', {
      provider: selection.provider,
      score: result.score,
    });

    return {
      data: result,
      provider: selection.provider,
      model: selection.model,
      tokens,
      cost,
      reasoning: selection.reasoning,
    };
  } catch (error) {
    logger.error('Enhanced anomaly detection failed', { error: String(error) });
    return {
      data: { score: 0, details: 'Anomaly detection unavailable' },
      provider: 'openai',
      model: 'fallback',
      tokens: 0,
      cost: 0,
      reasoning: 'Fallback response',
    };
  }
}

/**
 * Fallback: Basic regex-based entity extraction
 */
function extractBasicEntities(text: string): Entity[] {
  const entities: Entity[] = [];

  // Email addresses
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emails = text.match(emailRegex) || [];
  emails.forEach((email) => entities.push({ type: 'email', value: email }));

  // Phone numbers
  const phoneRegex = /\b(\+?1[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}\b/g;
  const phones = text.match(phoneRegex) || [];
  phones.forEach((phone) => entities.push({ type: 'phone', value: phone }));

  // Dates
  const dateRegex = /\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/g;
  const dates = text.match(dateRegex) || [];
  dates.forEach((date) => entities.push({ type: 'date', value: date }));

  // Money amounts
  const moneyRegex = /\$\s?\d{1,3}(,\d{3})*(\.\d{2})?/g;
  const amounts = text.match(moneyRegex) || [];
  amounts.forEach((amount) => entities.push({ type: 'money', value: amount }));

  return entities;
}

/**
 * Get AI usage statistics and analytics
 */
export function getAIAnalytics() {
  return ModelRouter.getStats();
}

export { generateEmbeddings, cosineSimilarity } from './ai.service';
