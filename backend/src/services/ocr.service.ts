import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { logger } from '@/lib/logger';

export interface OcrResult {
  text: string;
  pageCount: number;
  language: string;
  confidence: number;
}

export async function extractTextFromPdf(buffer: Buffer): Promise<OcrResult> {
  const data = await pdfParse(buffer);
  return {
    text: (data.text ?? '').trim(),
    pageCount: data.numpages ?? 1,
    language: 'en',
    confidence: 1.0,
  };
}

export async function extractTextFromDocx(buffer: Buffer): Promise<OcrResult> {
  const result = await mammoth.extractRawText({ buffer });
  return {
    text: (result.value ?? '').trim(),
    pageCount: 1,
    language: 'en',
    confidence: 1.0,
  };
}

export async function extractTextFromImage(buffer: Buffer): Promise<OcrResult> {
  try {
    const Tesseract = await import('tesseract.js');
    const { data } = await Tesseract.default.recognize(buffer, 'eng');
    return {
      text: (data.text ?? '').trim(),
      pageCount: 1,
      language: 'en',
      confidence: (data.confidence ?? 70) / 100,
    };
  } catch (e) {
    logger.warn('Tesseract OCR failed', { error: String(e) });
    return { text: '', pageCount: 1, language: 'en', confidence: 0 };
  }
}

export async function extractText(
  buffer: Buffer,
  mimeType: string
): Promise<OcrResult> {
  logger.info('Extracting text', { mimeType, bytes: buffer.length });

  if (
    mimeType === 'text/plain' ||
    mimeType === 'application/json' ||
    mimeType === 'text/markdown' ||
    mimeType === 'text/csv'
  ) {
    return {
      text: buffer.toString('utf-8').trim(),
      pageCount: 1,
      language: 'en',
      confidence: 1.0,
    };
  }

  if (mimeType === 'application/pdf') {
    return extractTextFromPdf(buffer);
  }
  if (
    mimeType ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return extractTextFromDocx(buffer);
  }
  if (mimeType.startsWith('image/')) {
    return extractTextFromImage(buffer);
  }

  // Fallback for any readable text
  try {
    const textAttempt = buffer.toString('utf-8').trim();
    if (textAttempt.length > 20 && !/[\x00-\x08\x0E-\x1F]/.test(textAttempt.slice(0, 100))) {
      return {
        text: textAttempt,
        pageCount: 1,
        language: 'en',
        confidence: 0.8,
      };
    }
  } catch {
    // ignore
  }

  throw new Error(`Unsupported MIME type for text extraction: ${mimeType}`);
}
