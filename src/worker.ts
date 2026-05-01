import { startDocumentProcessingWorker } from './services/queue.service';
import { connectDB } from './lib/db';
import { logger } from './lib/logger';

async function main() {
  logger.info('Starting SmartDocIQ document processing worker');

  await connectDB();
  logger.info('Database connected');

  const worker = startDocumentProcessingWorker();
  logger.info('BullMQ worker started', { concurrency: 3 });

  let shuttingDown = false;

  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`Received ${signal}, shutting down gracefully`);
    try {
      await worker.close();
      logger.info('Worker closed successfully');
    } catch (e) {
      logger.error('Error during shutdown', { error: String(e) });
    }
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('uncaughtException', (e) => {
    logger.error('Uncaught exception', { error: String(e) });
    void shutdown('uncaughtException');
  });
}

main().catch((e) => {
  console.error('Worker failed to start:', e);
  process.exit(1);
});
