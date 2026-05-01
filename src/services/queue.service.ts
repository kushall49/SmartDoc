import { Queue, Worker, Job } from 'bullmq';
import { getRedis } from '@/lib/redis';
import { processDocument } from '@/services/document-processor.service';
import { logger } from '@/lib/logger';

export const DOCUMENT_QUEUE_NAME = 'document-processing';

let documentQueue: Queue | null = null;
let documentWorker: Worker | null = null;

export function getDocumentQueue(): Queue {
  if (!documentQueue) {
    documentQueue = new Queue(DOCUMENT_QUEUE_NAME, {
      connection: getRedis(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    });
  }
  return documentQueue;
}

export function startDocumentProcessingWorker(): Worker {
  if (documentWorker) return documentWorker;

  documentWorker = new Worker(
    DOCUMENT_QUEUE_NAME,
    async (job: Job<{ documentId: string }>) => {
      logger.info('Worker: processing job', {
        jobId: job.id,
        documentId: job.data.documentId,
        attempt: job.attemptsMade,
      });
      await processDocument(job.data.documentId);
    },
    {
      connection: getRedis(),
      concurrency: 3,
    }
  );

  documentWorker.on('completed', (job) => {
    logger.info('Worker: job completed', { jobId: job.id });
  });

  documentWorker.on('failed', (job, error) => {
    logger.error('Worker: job failed', {
      jobId: job?.id,
      attempt: job?.attemptsMade,
      error: error.message,
    });
  });

  documentWorker.on('error', (error) => {
    logger.error('Worker error', { error: error.message });
  });

  logger.info('Document processing worker started');
  return documentWorker;
}

export async function addDocumentToQueue(documentId: string): Promise<string> {
  try {
    const queue = getDocumentQueue();
    const job = await queue.add(
      'process',
      { documentId },
      { jobId: `doc-${documentId}` }
    );
    logger.info('Document added to queue', { documentId, jobId: job.id });
    return job.id ?? documentId;
  } catch (e) {
    logger.warn('Queue unavailable, processing inline', {
      documentId,
      error: String(e),
    });
    // Fallback: process directly if Redis is unavailable
    void processDocument(documentId).catch((err) =>
      logger.error('Inline processing failed', {
        documentId,
        error: String(err),
      })
    );
    return documentId;
  }
}

export async function getJobStatus(jobId: string): Promise<{
  status: string;
  progress: number;
  error?: string;
}> {
  try {
    const queue = getDocumentQueue();
    const job = await queue.getJob(jobId);
    if (!job) return { status: 'not_found', progress: 0 };
    const state = await job.getState();
    return {
      status: state,
      progress: typeof job.progress === 'number' ? job.progress : 0,
      error: job.failedReason,
    };
  } catch {
    return { status: 'unknown', progress: 0 };
  }
}
