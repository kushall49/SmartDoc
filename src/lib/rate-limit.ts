import { logger } from './logger';

export async function rateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; reset: number }> {
  try {
    const { getRedis } = await import('./redis');
    const redis = getRedis();
    const key = `ratelimit:${identifier}`;
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const windowStart = now - windowMs;

    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(key, '-inf', windowStart.toString());
    pipeline.zadd(key, now.toString(), `${now}-${Math.random()}`);
    pipeline.zcard(key);
    pipeline.pexpire(key, windowMs);
    const results = await pipeline.exec();

    const count = (results?.[2]?.[1] as number) ?? 0;
    const allowed = count <= limit;
    const reset = Math.ceil((now + windowMs) / 1000);

    return { allowed, remaining: Math.max(0, limit - count), reset };
  } catch (e) {
    logger.warn('Rate limit check failed (allowing request)', { error: String(e) });
    return { allowed: true, remaining: limit, reset: 0 };
  }
}

export async function checkApiRateLimit(
  userId: string
): Promise<boolean> {
  const limit = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? '100');
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '900000');
  const { allowed } = await rateLimit(`api:${userId}`, limit, windowMs / 1000);
  return allowed;
}
