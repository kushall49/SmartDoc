import { openai, OPENAI_CONFIG } from '@/lib/openai';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export type TaskType =
  | 'ocr'
  | 'summarize'
  | 'extract'
  | 'classify'
  | 'embed'
  | 'chat'
  | 'search'
  | 'compare'
  | 'intelligence'
  | 'vision'
  | 'anomaly';

export interface AICompletionResult {
  content: string;
  provider: 'openai';
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  durationMs: number;
}

export interface RunAIOptions {
  userId: string | { toString(): string };
  documentId?: string | { toString(): string };
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'json_object' | 'text';
}

// Cost per 1,000,000 tokens in USD
const PRICING_PER_MILLION: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'text-embedding-3-small': { input: 0.02, output: 0.0 },
};

function calculateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING_PER_MILLION[model] ?? PRICING_PER_MILLION['gpt-4o-mini'];
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

/**
 * Select the appropriate OpenAI model based strictly on task requirements.
 * No multi-provider routing, no conditionals, no fallbacks.
 */
function resolveModel(task: TaskType, forcedModel?: string): string {
  if (forcedModel) return forcedModel;

  switch (task) {
    case 'chat':
    case 'compare':
    case 'intelligence':
    case 'vision':
      // Complex reasoning and high-fidelity generation
      return OPENAI_CONFIG.model; // gpt-4o

    case 'summarize':
    case 'extract':
    case 'classify':
    case 'anomaly':
    default:
      // Fast, cost-efficient structured extraction
      return OPENAI_CONFIG.fastModel; // gpt-4o-mini
  }
}

/**
 * Single direct entry point for all AI text generation in SmartDocIQ.
 * Calls OpenAI directly and records token usage & cost in PostgreSQL.
 */
export async function runAI(
  task: TaskType,
  systemPrompt: string,
  userPrompt: string,
  options: RunAIOptions
): Promise<AICompletionResult> {
  const model = resolveModel(task, options.model);
  const startTime = Date.now();
  const userIdStr = options.userId.toString();
  const documentIdStr = options.documentId ? options.documentId.toString() : null;

  try {
    const response = await openai.chat.completions.create({
      model,
      temperature: options.temperature ?? OPENAI_CONFIG.temperature,
      max_tokens: options.maxTokens ?? 2000,
      response_format: options.responseFormat ? { type: options.responseFormat } : undefined,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const inputTokens = response.usage?.prompt_tokens ?? 0;
    const outputTokens = response.usage?.completion_tokens ?? 0;
    const totalTokens = response.usage?.total_tokens ?? inputTokens + outputTokens;
    const durationMs = Date.now() - startTime;
    const estimatedCostUsd = calculateCostUsd(model, inputTokens, outputTokens);
    const content = response.choices[0]?.message?.content ?? '';

    // Asynchronously log usage to PostgreSQL
    prisma.usageLog
      .create({
        data: {
          userId: userIdStr,
          documentId: documentIdStr,
          action: task,
          provider: 'openai',
          model,
          inputTokens,
          outputTokens,
          totalTokens,
          estimatedCostUsd,
          durationMs,
          success: true,
        },
      })
      .catch((logErr) => {
        logger.warn('Failed to persist AI usage log to PostgreSQL', { error: String(logErr) });
      });

    return {
      content,
      provider: 'openai',
      model,
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCostUsd,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error('OpenAI generation failed', { task, model, error: String(error) });

    // Log failed attempt to PostgreSQL
    prisma.usageLog
      .create({
        data: {
          userId: userIdStr,
          documentId: documentIdStr,
          action: task,
          provider: 'openai',
          model,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          estimatedCostUsd: 0,
          durationMs,
          success: false,
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      })
      .catch(() => {});

    throw error;
  }
}

