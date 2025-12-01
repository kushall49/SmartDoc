import openai, { OPENAI_CONFIG } from '@/lib/openai';
import { logger } from '@/lib/logger';
import { Entity } from '@/types';

/**
 * Generate a summary of the document text
 */
export async function generateSummary(text: string, maxLength = 500): Promise<string> {
  try {
    logger.info('Generating summary', { textLength: text.length, maxLength });

    const response = await openai.chat.completions.create({
      model: OPENAI_CONFIG.model,
      messages: [
        {
          role: 'system',
          content: `You are a professional document analyst. Generate a concise, informative summary of the provided text. The summary should be no more than ${maxLength} characters and capture the key points, main ideas, and important details.`,
        },
        {
          role: 'user',
          content: `Please summarize the following document:\n\n${text.substring(0, 15000)}`, // Limit to avoid token issues
        },
      ],
      temperature: OPENAI_CONFIG.temperature,
      max_tokens: 500,
    });

    const summary = response.choices[0]?.message?.content?.trim() || '';

    logger.info('Summary generated', { summaryLength: summary.length });

    return summary;
  } catch (error) {
    logger.error('Summary generation failed', error as Error);
    throw new Error('Failed to generate summary');
  }
}

/**
 * Extract entities from the document text
 */
export async function extractEntities(text: string): Promise<Entity[]> {
  try {
    logger.info('Extracting entities', { textLength: text.length });

    const response = await openai.chat.completions.create({
      model: OPENAI_CONFIG.model,
      messages: [
        {
          role: 'system',
          content: `You are an expert in Named Entity Recognition (NER). Extract all important entities from the provided text. For each entity, identify its type (person, organization, location, date, money, email, phone, id, or other) and value. Return the results as a JSON array with objects containing "type" and "value" fields.`,
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
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(content);
    const entities: Entity[] = parsed.entities || [];

    logger.info('Entities extracted', { count: entities.length });

    return entities;
  } catch (error) {
    logger.error('Entity extraction failed', error as Error);
    
    // Fallback: return basic regex-based entities
    return extractBasicEntities(text);
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
  emails.forEach((email) => {
    entities.push({ type: 'email', value: email });
  });

  // Phone numbers (US format)
  const phoneRegex = /\b(\+?1[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}\b/g;
  const phones = text.match(phoneRegex) || [];
  phones.forEach((phone) => {
    entities.push({ type: 'phone', value: phone });
  });

  // Dates (simple format)
  const dateRegex = /\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/g;
  const dates = text.match(dateRegex) || [];
  dates.forEach((date) => {
    entities.push({ type: 'date', value: date });
  });

  // Money amounts
  const moneyRegex = /\$\s?\d{1,3}(,\d{3})*(\.\d{2})?/g;
  const amounts = text.match(moneyRegex) || [];
  amounts.forEach((amount) => {
    entities.push({ type: 'money', value: amount });
  });

  logger.info('Basic entities extracted', { count: entities.length });

  return entities;
}

/**
 * Classify the document type
 */
export async function classifyDocument(text: string): Promise<string> {
  try {
    logger.info('Classifying document', { textLength: text.length });

    const response = await openai.chat.completions.create({
      model: OPENAI_CONFIG.model,
      messages: [
        {
          role: 'system',
          content: `You are a document classification expert. Classify the provided document into one of the following categories: invoice, contract, resume, report, letter, form, receipt, statement, other. Return only the category name in lowercase.`,
        },
        {
          role: 'user',
          content: `Classify this document:\n\n${text.substring(0, 5000)}`,
        },
      ],
      temperature: 0.1, // Low temperature for consistent classification
      max_tokens: 20,
    });

    const classification = response.choices[0]?.message?.content?.trim().toLowerCase() || 'other';

    logger.info('Document classified', { type: classification });

    return classification;
  } catch (error) {
    logger.error('Document classification failed', error as Error);
    return 'other';
  }
}

/**
 * Detect anomalies or suspicious content in the document
 */
export async function detectAnomalies(text: string): Promise<{
  score: number;
  details: string;
}> {
  try {
    logger.info('Detecting anomalies', { textLength: text.length });

    const response = await openai.chat.completions.create({
      model: OPENAI_CONFIG.model,
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
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const result = JSON.parse(content);

    logger.info('Anomaly detection completed', { score: result.score });

    return {
      score: result.score || 0,
      details: result.details || 'No anomalies detected',
    };
  } catch (error) {
    logger.error('Anomaly detection failed', error as Error);
    return {
      score: 0,
      details: 'Anomaly detection unavailable',
    };
  }
}

/**
 * Generate embeddings for text chunks
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    logger.info('Generating embeddings', { count: texts.length });

    const response = await openai.embeddings.create({
      model: OPENAI_CONFIG.embeddingModel,
      input: texts,
    });

    const embeddings = response.data.map((item) => item.embedding);

    logger.info('Embeddings generated', { count: embeddings.length });

    return embeddings;
  } catch (error) {
    logger.error('Embedding generation failed', error as Error);
    throw new Error('Failed to generate embeddings');
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }

  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}
