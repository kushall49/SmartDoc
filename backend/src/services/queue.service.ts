import { Queue, Worker, Job } from 'bullmq';
import { getRedis } from '@/lib/redis';
import { processDocument } from '@/services/document-processor.service';
import { logger } from '@/lib/logger';

export const DOCUMENT_QUEUE_NAME = 'document-processing';

let documentQueue: Queue | null = null;
let documentWorker: Worker | null = null;

/**
 * Returns the singleton BullMQ Document Processing Queue.
 * Single mode only — no dual-mode, no serverless branches, no inline fallbacks.
 */
export function getDocumentQueue(): Queue {
  if (!documentQueue) {
    documentQueue = new Queue(DOCUMENT_QUEUE_NAME, {
      connection: getRedis(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 3000,
        },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    });
  }
  return documentQueue;
}

/**
 * Pushes a document ID to the BullMQ processing queue on Redis.
 * Called immediately upon successful file upload.
 */
export async function addDocumentToQueue(documentId: string): Promise<string> {
  const queue = getDocumentQueue();
  const job = await queue.add(
    'process',
    { documentId },
    {
      jobId: `doc-${documentId}`,
    }
  );

  logger.info('Document added to BullMQ queue', {
    documentId,
    jobId: job.id,
  });

  return job.id ?? documentId;
}

/**
 * Starts the standalone BullMQ worker process.
 * Concurrency: 3 simultaneous document extractions.
 */
export function startDocumentProcessingWorker(): Worker {
  if (documentWorker) return documentWorker;

  documentWorker = new Worker(
    DOCUMENT_QUEUE_NAME,
    async (job: Job<{ documentId: string }>) => {
      logger.info('BullMQ Worker: Starting document processing', {
        jobId: job.id,
        documentId: job.data.documentId,
        attempt: job.attemptsMade + 1,
      });

      await processDocument(job.data.documentId);

      logger.info('BullMQ Worker: Document processed successfully', {
        jobId: job.id,
        documentId: job.data.documentId,
      });
    },
    {
      connection: getRedis(),
      concurrency: 3,
    }
  );

  documentWorker.on('completed', (job) => {
    logger.info('BullMQ Worker: Job completed', { jobId: job.id });
  });

  documentWorker.on('failed', (job, error) => {
    logger.error('BullMQ Worker: Job failed', {
      jobId: job?.id,
      documentId: job?.data.documentId,
      attempt: job?.attemptsMade,
      error: error.message,
    });
  });

  documentWorker.on('error', (error) => {
    logger.error('BullMQ Worker encountered connection error', { error: error.message });
  });

  logger.info('BullMQ document processing worker initialized');
  return documentWorker;
}

/**
 * Gracefully shuts down the worker and queue connections.
 */
export async function closeQueue(): Promise<void> {
  if (documentWorker) {
    await documentWorker.close();
    documentWorker = null;
  }
  if (documentQueue) {
    await documentQueue.close();
    documentQueue = null;
  }
}
