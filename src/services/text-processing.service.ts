import { logger } from '@/lib/logger';

/**
 * Clean and normalize extracted text
 */
export function cleanText(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ');

  // Remove excessive newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // Remove special characters that don't add value
  // eslint-disable-next-line no-control-regex
  cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, '');

  // Trim
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Remove common noise from OCR output
 */
export function removeOCRNoise(text: string): string {
  let cleaned = text;

  // Remove common OCR artifacts
  cleaned = cleaned.replace(/[|]{2,}/g, '');
  cleaned = cleaned.replace(/_{3,}/g, '');
  cleaned = cleaned.replace(/\.{4,}/g, '...');

  // Fix common OCR mistakes
  cleaned = cleaned.replace(/\b0\b/g, 'O'); // Zero to letter O in context
  cleaned = cleaned.replace(/\bl\b/g, 'I'); // lowercase l to uppercase I

  return cleaned;
}

/**
 * Split text into chunks for embedding generation
 */
export function chunkText(
  text: string,
  chunkSize = 1000,
  overlap = 200
): string[] {
  if (!text || text.length === 0) return [];

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    const endIndex = Math.min(startIndex + chunkSize, text.length);
    let chunk = text.substring(startIndex, endIndex);

    // Try to end at a sentence boundary
    if (endIndex < text.length) {
      const lastPeriod = chunk.lastIndexOf('.');
      const lastNewline = chunk.lastIndexOf('\n');
      const lastBoundary = Math.max(lastPeriod, lastNewline);

      if (lastBoundary > chunkSize * 0.5) {
        chunk = chunk.substring(0, lastBoundary + 1);
      }
    }

    chunks.push(chunk.trim());
    startIndex += chunk.length - overlap;
  }

  logger.debug('Text chunked', { totalChunks: chunks.length, chunkSize, overlap });

  return chunks;
}

/**
 * Extract sentences from text
 */
export function extractSentences(text: string): string[] {
  if (!text) return [];

  // Split on sentence boundaries
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10); // Filter out very short fragments

  return sentences;
}

/**
 * Calculate text statistics
 */
export interface TextStats {
  characterCount: number;
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  averageWordLength: number;
  readabilityScore?: number;
  // Aliases for compatibility
  characters: number;
  words: number;
  sentences: number;
}

export function calculateTextStats(text: string): TextStats {
  const characterCount = text.length;
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;
  const sentences = extractSentences(text);
  const sentenceCount = sentences.length;
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim().length > 0);
  const paragraphCount = paragraphs.length;

  const averageWordLength =
    words.reduce((sum, word) => sum + word.length, 0) / (wordCount || 1);

  // Simple readability score (Flesch-Kincaid approximation)
  const averageSentenceLength = wordCount / (sentenceCount || 1);
  const averageSyllablesPerWord = averageWordLength / 2; // Rough approximation
  const readabilityScore =
    206.835 -
    1.015 * averageSentenceLength -
    84.6 * averageSyllablesPerWord;

  return {
    characterCount,
    wordCount,
    sentenceCount,
    paragraphCount,
    averageWordLength: Math.round(averageWordLength * 10) / 10,
    readabilityScore: Math.round(readabilityScore * 10) / 10,
    // Aliases
    characters: characterCount,
    words: wordCount,
    sentences: sentenceCount,
  };
}

/**
 * Extract keywords from text (simple frequency-based)
 */
export function extractKeywords(text: string, topN = 10): string[] {
  // Common stop words to filter out
  const stopWords = new Set([
    'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but',
    'in', 'with', 'to', 'for', 'of', 'as', 'by', 'that', 'this',
    'it', 'from', 'are', 'was', 'were', 'been', 'be', 'have', 'has',
    'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  ]);

  // Tokenize and normalize
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word));

  // Count frequencies
  const frequency: Record<string, number> = {};
  words.forEach((word) => {
    frequency[word] = (frequency[word] || 0) + 1;
  });

  // Sort by frequency and return top N
  const keywords = Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word]) => word);

  return keywords;
}

/**
 * Normalize text for comparison
 */
export function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate similarity between two texts (simple Jaccard similarity)
 */
export function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = new Set(normalizeForComparison(text1).split(/\s+/));
  const words2 = new Set(normalizeForComparison(text2).split(/\s+/));

  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / (union.size || 1);
}
