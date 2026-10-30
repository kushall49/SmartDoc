import 'dotenv/config';
import { createApp } from './app';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

const PORT = parseInt(process.env.PORT || '4000', 10);

async function startServer() {
  try {
    // 1. Check PostgreSQL connection
    await prisma.$connect();
    logger.info('Connected to PostgreSQL successfully');

    // 2. Start Express app
    const app = createApp();
    const server = app.listen(PORT, () => {
      logger.info(`🚀 SmartDocIQ Express API server running on http://localhost:${PORT}`);
    });

    // 3. Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, closing server gracefully...`);
      server.close(async () => {
        await prisma.$disconnect();
        logger.info('Server and DB connection closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start Express server', { error: String(error) });
    process.exit(1);
  }
}

startServer();

export default startServer;

