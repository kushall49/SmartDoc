import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional().default('http://localhost:3000'),
  NEXTAUTH_URL: z.string().url().default('http://localhost:3000'),
  NEXTAUTH_SECRET: z.string().min(10),
  MONGODB_URI: z.string().startsWith('mongodb'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional().default(''),
  AWS_ACCESS_KEY_ID: z.string().optional().default(''),
  AWS_SECRET_ACCESS_KEY: z.string().optional().default(''),
  AWS_REGION: z.string().optional().default('us-east-1'),
  AWS_S3_BUCKET_NAME: z.string().optional().default('smartdociq-documents'),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().default('gpt-4o'),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  OPENAI_FALLBACK_MODEL: z.string().default('gpt-4o-mini'),
  GROQ_API_KEY: z.string().optional().default(''),
  ANTHROPIC_API_KEY: z.string().optional().default(''),
  ANTHROPIC_MODEL: z.string().default('claude-3-5-sonnet-20241022'),
  MAX_FILE_SIZE_MB: z.coerce.number().default(10),
  MAX_TOKENS_PER_USER_PER_DAY: z.coerce.number().default(100000),
  ALLOWED_FILE_TYPES: z.string().default('pdf,png,jpg,jpeg,docx'),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  USE_AWS_TEXTRACT: z.string().optional().default('false'),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues
      .map(i => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    // Only throw in server context, not during Next.js build edge cases
    if (typeof window === 'undefined') {
      console.error(`\n[SmartDocIQ] Environment validation:\n${missing}\n`);
    }
    // Return partial data with defaults rather than crashing build
    return envSchema.parse({ ...process.env });
  }
  return parsed.data;
}

export const env = validateEnv();
