import { Redis, RedisOptions } from 'ioredis';
import { logger } from './logger';

let redisClient: Redis | null = null;

const redisOptions: RedisOptions = {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  lazyConnect: true,
  retryStrategy: (times: number) => {
    if (times > 5) return null;
    return Math.min(times * 300, 2000);
  },
};

export function getRedis(): Redis {
  if (redisClient) return redisClient;

  const url = process.env.REDIS_URL?.trim();

  if (url) {
    redisClient = new Redis(url, redisOptions);
  } else {
    const host = process.env.REDIS_HOST ?? 'localhost';
    const port = parseInt(process.env.REDIS_PORT ?? '6379');
    const password = process.env.REDIS_PASSWORD || undefined;
    const useTls = process.env.REDIS_TLS === 'true';

    redisClient = new Redis({
      host,
      port,
      password,
      tls: useTls ? {} : undefined,
      ...redisOptions,
    });
  }

  redisClient.on('error', (e) =>
    logger.warn('Redis connection event', { error: e.message })
  );
  redisClient.on('connect', () => logger.info('Redis connected successfully'));

  return redisClient;
}

export default getRedis;
