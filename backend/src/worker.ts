import 'dotenv/config';
import { startDocumentProcessingWorker } from './services/queue.service';
import { prisma } from './lib/db';
import { logger } from './lib/logger';

async function main() {
  logger.info('Starting SmartDocIQ BullMQ worker process');

  // Verify PostgreSQL connectivity
  await prisma.$connect();
  logger.info('Connected to PostgreSQL successfully');

  // Start BullMQ worker listening on the document-processing queue
  const worker = startDocumentProcessingWorker();
  logger.info('BullMQ worker is listening for document-processing jobs', { concurrency: 3 });

  let shuttingDown = false;

  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`Received ${signal}, shutting down BullMQ worker gracefully...`);
    try {
      await worker.close();
      await prisma.$disconnect();
      logger.info('BullMQ worker closed cleanly');
    } catch (e) {
      logger.error('Error during shutdown', { error: String(e) });
    }
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('uncaughtException', (e) => {
    logger.error('Uncaught worker exception', { error: String(e) });
    void shutdown('uncaughtException');
  });
}

main().catch((e) => {
  console.error('Worker failed to start:', e);
  process.exit(1);
});
