import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';

export async function GET() {
  const checks: Record<string, 'ok' | 'down'> = {};
  let healthy = true;

  try {
    await connectDB();
    checks.mongodb = 'ok';
  } catch {
    checks.mongodb = 'down';
    healthy = false;
  }

  try {
    const { getRedis } = await import('@/lib/redis');
    await getRedis().ping();
    checks.redis = 'ok';
  } catch {
    checks.redis = 'down';
    // Redis is optional — don't mark as unhealthy
  }

  return NextResponse.json(
    {
      status: healthy ? 'healthy' : 'degraded',
      services: checks,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '1.0.0',
    },
    { status: healthy ? 200 : 503 }
  );
}
