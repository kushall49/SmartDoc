import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  FRONTEND_URL: z.string().optional().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1).default(process.env.DATABASE_URL || ''),
  JWT_SECRET: z.string().min(8).default(process.env.JWT_SECRET || 'smartdoc-super-secret-jwt-key-2026'),
  REDIS_URL: z.string().optional().default(process.env.REDIS_URL || ''),
  REDIS_HOST: z.string().default(process.env.REDIS_HOST || 'localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional().default(process.env.REDIS_PASSWORD || ''),
  OPENAI_API_KEY: z.string().min(1).default(process.env.OPENAI_API_KEY || 'sk-proj-placeholder'),
  OPENAI_MODEL: z.string().default('gpt-4o'),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  OPENAI_FALLBACK_MODEL: z.string().default('gpt-4o-mini'),
  MAX_FILE_SIZE_MB: z.coerce.number().default(10),
  MAX_TOKENS_PER_USER_PER_DAY: z.coerce.number().default(100000),
  ALLOWED_FILE_TYPES: z.string().default('pdf,png,jpg,jpeg,docx,txt'),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    console.warn(`\n[SmartDocIQ] Environment validation notice:\n${missing}\n`);
    return envSchema.parse({ ...process.env });
  }
  return parsed.data;
}

export const env = validateEnv();
