import { Redis } from 'ioredis';
import { logger } from './logger';

let redisClient: Redis | null = null;

export function getRedis(): Redis {
  if (redisClient) return redisClient;

  const host = process.env.REDIS_HOST ?? 'localhost';
  const port = parseInt(process.env.REDIS_PORT ?? '6379');
  const password = process.env.REDIS_PASSWORD ?? undefined;

  const useTls = process.env.REDIS_TLS === 'true';

  redisClient = new Redis({
    host,
    port,
    password: password || undefined,
    tls: useTls ? {} : undefined,
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy: (times) => {
      if (times > 5) return null; // Stop retrying after 5 attempts
      return Math.min(times * 200, 2000);
    },
  });

  redisClient.on('error', (e) =>
    logger.warn('Redis error (non-fatal)', { error: e.message })
  );
  redisClient.on('connect', () => logger.info('Redis connected'));
  redisClient.on('close', () => logger.warn('Redis connection closed'));

  return redisClient;
}
