import { Queue, Worker, Job } from 'bullmq';
import { redisConnection } from '@/lib/redis';
import { logger } from '@/lib/logger';
import DocumentModel from '@/models/Document';
import { downloadFromS3 } from '@/utils/s3';
import { extractTextFromDocument } from '@/services/ocr.service';
import { cleanText, chunkText } from '@/services/text-processing.service';
import {
  generateSummary,
  extractEntities,
  classifyDocument,
  detectAnomalies,
  generateEmbeddings,
} from '@/services/ai.service';
import { storeEmbeddings } from '@/services/vector-search.service';
import { PROCESSING_CONFIG } from '@/lib/config';

export interface DocumentProcessingJobData {
  documentId: string;
  userId: string;
  s3Key: string;
  fileType: string;
}

// Create job queue
export const documentProcessingQueue = new Queue<DocumentProcessingJobData>(
  'document-processing',
  {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        count: 100,
        age: 24 * 3600, // 24 hours
      },
      removeOnFail: {
        count: 1000,
      },
    },
  }
);

/**
 * Add a document to the processing queue
 */
export async function queueDocumentProcessing(
  data: DocumentProcessingJobData
): Promise<string> {
  try {
    const job = await documentProcessingQueue.add('process-document', data, {
      jobId: data.documentId, // Use documentId as jobId to prevent duplicates
    });

    logger.info('Document queued for processing', {
      jobId: job.id,
      documentId: data.documentId,
    });

    return job.id!;
  } catch (error) {
    logger.error('Failed to queue document', error as Error);
    throw new Error('Failed to queue document for processing');
  }
}

/**
 * Update document processing status
 */
async function updateDocumentStatus(
  documentId: string,
  stage: 'uploaded' | 'processing' | 'completed' | 'failed',
  progress: number,
  message?: string,
  error?: string
) {
  await DocumentModel.findByIdAndUpdate(documentId, {
    'status.stage': stage,
    'status.progress': progress,
    'status.message': message,
    'status.error': error,
    'status.startedAt': stage === 'processing' ? new Date() : undefined,
    'status.completedAt': stage === 'completed' || stage === 'failed' ? new Date() : undefined,
  });
}

/**
 * Process document job
 */
async function processDocument(job: Job<DocumentProcessingJobData>) {
  const { documentId, s3Key, fileType } = job.data;

  try {
    logger.info('Starting document processing', { documentId, jobId: job.id });

    // Update status: Processing started
    await updateDocumentStatus(documentId, 'processing', 10, 'Downloading file...');
    await job.updateProgress(10);

    // Step 1: Download file from S3
    const fileBuffer = await downloadFromS3(s3Key);
    logger.info('File downloaded from S3', { documentId, size: fileBuffer.length });

    // Step 2: Extract text
    await updateDocumentStatus(documentId, 'processing', 25, 'Extracting text...');
    await job.updateProgress(25);

    const extractedText = await extractTextFromDocument(fileBuffer, fileType);
    const cleanedText = cleanText(extractedText);

    if (!cleanedText || cleanedText.length < 50) {
      throw new Error('Insufficient text extracted from document');
    }

    await DocumentModel.findByIdAndUpdate(documentId, { extractedText: cleanedText });
    logger.info('Text extracted', { documentId, textLength: cleanedText.length });

    // Step 3: Generate summary
    await updateDocumentStatus(documentId, 'processing', 40, 'Generating summary...');
    await job.updateProgress(40);

    const summary = await generateSummary(cleanedText);
    await DocumentModel.findByIdAndUpdate(documentId, { summary });
    logger.info('Summary generated', { documentId });

    // Step 4: Extract entities
    await updateDocumentStatus(documentId, 'processing', 55, 'Extracting entities...');
    await job.updateProgress(55);

    const entities = await extractEntities(cleanedText);
    await DocumentModel.findByIdAndUpdate(documentId, { entities });
    logger.info('Entities extracted', { documentId, count: entities.length });

    // Step 5: Classify document
    await updateDocumentStatus(documentId, 'processing', 65, 'Classifying document...');
    await job.updateProgress(65);

    const documentType = await classifyDocument(cleanedText);
    await DocumentModel.findByIdAndUpdate(documentId, { documentType });
    logger.info('Document classified', { documentId, type: documentType });

    // Step 6: Detect anomalies
    await updateDocumentStatus(documentId, 'processing', 75, 'Detecting anomalies...');
    await job.updateProgress(75);

    const { score: anomalyScore, details: anomalyDetails } = await detectAnomalies(cleanedText);
    await DocumentModel.findByIdAndUpdate(documentId, {
      anomalyScore,
      anomalyDetails,
    });
    logger.info('Anomaly detection completed', { documentId, score: anomalyScore });

    // Step 7: Generate embeddings
    await updateDocumentStatus(documentId, 'processing', 85, 'Generating embeddings...');
    await job.updateProgress(85);

    const chunks = chunkText(
      cleanedText,
      PROCESSING_CONFIG.chunkSize,
      PROCESSING_CONFIG.chunkOverlap
    );

    if (chunks.length > 0) {
      const embeddings = await generateEmbeddings(chunks);
      await storeEmbeddings(documentId, chunks, embeddings);
      logger.info('Embeddings generated', { documentId, chunks: chunks.length });
    }

    // Step 8: Complete
    await updateDocumentStatus(
      documentId,
      'completed',
      100,
      'Processing completed successfully'
    );
    await job.updateProgress(100);

    logger.info('Document processing completed', { documentId });

    return { success: true, documentId };
  } catch (error) {
    logger.error('Document processing failed', error as Error, { documentId });

    await updateDocumentStatus(
      documentId,
      'failed',
      0,
      'Processing failed',
      (error as Error).message
    );

    throw error;
  }
}

/**
 * Create and start the worker
 */
export function startDocumentProcessingWorker() {
  const worker = new Worker<DocumentProcessingJobData>(
    'document-processing',
    processDocument,
    {
      connection: redisConnection,
      concurrency: PROCESSING_CONFIG.maxConcurrentJobs,
      limiter: {
        max: 10,
        duration: 60000, // 10 jobs per minute
      },
    }
  );

  worker.on('completed', (job) => {
    logger.info('Job completed', { jobId: job.id, documentId: job.data.documentId });
  });

  worker.on('failed', (job, error) => {
    logger.error('Job failed', error, {
      jobId: job?.id,
      documentId: job?.data.documentId,
    });
  });

  worker.on('error', (error) => {
    logger.error('Worker error', error as Error);
  });

  logger.info('Document processing worker started', {
    concurrency: PROCESSING_CONFIG.maxConcurrentJobs,
  });

  return worker;
}

/**
 * Get job status
 */
export async function getJobStatus(jobId: string) {
  try {
    const job = await documentProcessingQueue.getJob(jobId);

    if (!job) {
      return null;
    }

    const state = await job.getState();
    const progress = job.progress;

    return {
      id: job.id,
      state,
      progress,
      data: job.data,
      failedReason: job.failedReason,
      finishedOn: job.finishedOn,
    };
  } catch (error) {
    logger.error('Failed to get job status', error as Error);
    return null;
  }
}

/**
 * Cancel a job
 */
export async function cancelJob(jobId: string): Promise<boolean> {
  try {
    const job = await documentProcessingQueue.getJob(jobId);

    if (!job) {
      return false;
    }

    await job.remove();
    logger.info('Job cancelled', { jobId });

    return true;
  } catch (error) {
    logger.error('Failed to cancel job', error as Error);
    return false;
  }
}
