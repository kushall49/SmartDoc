import Tesseract from 'tesseract.js';
import { logger } from '@/lib/logger';
import { PROCESSING_CONFIG } from '@/lib/config';

export interface OCRResult {
  text: string;
  confidence: number;
  language?: string;
}

/**
 * Extract text from an image using Tesseract.js OCR
 */
export async function extractTextFromImage(
  imageBuffer: Buffer,
  language = 'eng'
): Promise<OCRResult> {
  try {
    logger.info('Starting OCR extraction', { language, bufferSize: imageBuffer.length });

    const { data } = await Tesseract.recognize(imageBuffer, language, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          logger.debug('OCR progress', { progress: Math.round(m.progress * 100) });
        }
      },
    });

    const result: OCRResult = {
      text: data.text.trim(),
      confidence: data.confidence,
      language: data.text.length > 0 ? language : undefined,
    };

    logger.info('OCR extraction completed', {
      textLength: result.text.length,
      confidence: result.confidence,
    });

    return result;
  } catch (error) {
    logger.error('OCR extraction failed', error as Error);
    throw new Error('Failed to extract text from image');
  }
}

/**
 * Extract text from PDF using pdf-parse
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  try {
    logger.info('Starting PDF text extraction', { bufferSize: pdfBuffer.length });

    const pdf = await import('pdf-parse');
    const data = await pdf.default(pdfBuffer);

    const text = data.text.trim();

    logger.info('PDF extraction completed', {
      pages: data.numpages,
      textLength: text.length,
    });

    return text;
  } catch (error) {
    logger.error('PDF extraction failed', error as Error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Extract text from DOCX using mammoth
 */
export async function extractTextFromDOCX(docxBuffer: Buffer): Promise<string> {
  try {
    logger.info('Starting DOCX text extraction', { bufferSize: docxBuffer.length });

    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer: docxBuffer });

    const text = result.value.trim();

    logger.info('DOCX extraction completed', {
      textLength: text.length,
      warnings: result.messages.length,
    });

    if (result.messages.length > 0) {
      logger.warn('DOCX extraction warnings', { messages: result.messages });
    }

    return text;
  } catch (error) {
    logger.error('DOCX extraction failed', error as Error);
    throw new Error('Failed to extract text from DOCX');
  }
}

/**
 * Extract text from a document based on file type
 */
export async function extractTextFromDocument(
  buffer: Buffer,
  fileType: string
): Promise<string> {
  const normalizedType = fileType.toLowerCase();

  logger.info('Extracting text from document', { fileType: normalizedType });

  try {
    switch (normalizedType) {
      case 'pdf':
        return await extractTextFromPDF(buffer);

      case 'docx':
        return await extractTextFromDOCX(buffer);

      case 'png':
      case 'jpg':
      case 'jpeg': {
        const ocrResult = await extractTextFromImage(buffer);
        return ocrResult.text;
      }

      case 'txt':
        return buffer.toString('utf-8').trim();

      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  } catch (error) {
    logger.error('Document text extraction failed', error as Error, { fileType });
    throw error;
  }
}

/**
 * AWS Textract integration (optional, if configured)
 * This is a placeholder for AWS Textract implementation
 */
export async function extractTextWithAWSTextract(
  s3Key: string
): Promise<OCRResult> {
  if (!PROCESSING_CONFIG.useAWSTextract) {
    throw new Error('AWS Textract is not configured');
  }

  try {
    logger.info('Using AWS Textract for OCR', { s3Key });

    // TODO: Implement AWS Textract integration
    // const textract = new TextractClient({ region: AWS_CONFIG.region });
    // const command = new DetectDocumentTextCommand({
    //   Document: {
    //     S3Object: {
    //       Bucket: AWS_CONFIG.bucketName,
    //       Name: s3Key,
    //     },
    //   },
    // });
    // const response = await textract.send(command);
    // Process response...

    throw new Error('AWS Textract integration not yet implemented');
  } catch (error) {
    logger.error('AWS Textract extraction failed', error as Error);
    throw new Error('Failed to extract text using AWS Textract');
  }
}
