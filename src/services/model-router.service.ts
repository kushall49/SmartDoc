import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '@/lib/logger';
import { connectDB } from '@/lib/db';
import { UsageLog } from '@/models/UsageLog';
import type { UsageAction } from '@/models/UsageLog';
import mongoose from 'mongoose';

function normalizeApiKey(raw?: string): string {
  return (raw ?? '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // strip hidden unicode chars
    .trim()
    .replace(/^['"]|['"]$/g, '');
}

const openAiApiKey = normalizeApiKey(process.env.OPENAI_API_KEY);
const groqApiKey = normalizeApiKey(process.env.GROQ_API_KEY);
const anthropicApiKey = normalizeApiKey(process.env.ANTHROPIC_API_KEY);

const openai = new OpenAI({ apiKey: openAiApiKey });
const groq = new OpenAI({
  apiKey: groqApiKey,
  baseURL: 'https://api.groq.com/openai/v1',
});
const anthropic = new Anthropic({ apiKey: anthropicApiKey });
const hasAnthropicKey = Boolean(anthropicApiKey);
const hasGroqKey = Boolean(groqApiKey);

// Cost per 1000 tokens in USD
const PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o':                         { input: 0.005,   output: 0.015 },
  'gpt-4o-mini':                    { input: 0.00015, output: 0.0006 },
  'claude-3-5-sonnet-20241022':     { input: 0.003,   output: 0.015 },
  'claude-3-5-haiku-20241022':      { input: 0.0008,  output: 0.004 },
  'claude-3-haiku-20240307':        { input: 0.00025, output: 0.00125 },
  'text-embedding-3-small':         { input: 0.00002, output: 0 },
  'text-embedding-3-large':         { input: 0.00013, output: 0 },
  'llama-3.3-70b-versatile':        { input: 0.00059, output: 0.00079 },
};

export type TaskType = UsageAction;
export type AIProvider = 'openai' | 'anthropic' | 'groq';

interface SmartSelection {
  provider: AIProvider;
  model: string;
  reasoning: string;
  estimatedCost: number;
}

export interface RouterResult {
  content: string;
  provider: AIProvider;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  durationMs: number;
}

function selectModel(
  task: TaskType,
  complexity: 'low' | 'medium' | 'high',
  documentType?: string
): { provider: AIProvider; model: string } {
  if (task === 'embed') {
    return { provider: 'openai', model: 'text-embedding-3-small' };
  }

  const hasOpenAiKey = Boolean(openAiApiKey);
  const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY?.trim());

  // Groq is the primary text-generation provider.
  if (hasGroqKey) {
    return { provider: 'groq', model: 'llama-3.3-70b-versatile' };
  }

  if (hasAnthropic) {
    return { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' };
  }

  if (hasOpenAiKey) {
    if (task === 'chat') return { provider: 'openai', model: 'gpt-4o' };
    return { provider: 'openai', model: 'gpt-4o-mini' };
  }

  throw new Error('No AI provider configured. Set GROQ_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY.');
}

function assessComplexity(text: string): 'low' | 'medium' | 'high' {
  const words = text.split(/\s+/).length;
  if (words < 300) return 'low';
  if (words < 1500) return 'medium';
  return 'high';
}

function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = PRICING[model];
  if (!pricing) return 0;
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1000;
}

const providerCostPerMillion: Record<AIProvider, number> = {
  openai: 1.5,
  anthropic: 3,
  groq: 0.7,
};

const routerStats: Record<AIProvider, { requests: number; tokens: number; cost: number }> = {
  openai: { requests: 0, tokens: 0, cost: 0 },
  anthropic: { requests: 0, tokens: 0, cost: 0 },
  groq: { requests: 0, tokens: 0, cost: 0 },
};

export async function runAI(
  task: TaskType,
  systemPrompt: string,
  userPrompt: string,
  options: {
    userId: mongoose.Types.ObjectId;
    documentId?: mongoose.Types.ObjectId;
    forceProvider?: AIProvider;
    forceModel?: string;
    documentType?: string;
    maxTokens?: number;
    isFallback?: boolean;
  }
): Promise<RouterResult> {
  const complexity = assessComplexity(userPrompt);
  const { provider, model } = options.forceProvider
    ? { provider: options.forceProvider, model: options.forceModel ?? 'gpt-4o-mini' }
    : selectModel(task, complexity, options.documentType);

  const startTime = Date.now();
  let result: RouterResult;

  try {
    if (provider === 'openai') {
      const response = await openai.chat.completions.create({
        model,
        max_tokens: options.maxTokens ?? 2000,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      });
      const inputTokens = response.usage?.prompt_tokens ?? 0;
      const outputTokens = response.usage?.completion_tokens ?? 0;
      result = {
        content: response.choices[0]?.message?.content ?? '',
        provider: 'openai',
        model,
        inputTokens,
        outputTokens,
        estimatedCostUsd: calculateCost(model, inputTokens, outputTokens),
        durationMs: Date.now() - startTime,
      };
    } else if (provider === 'anthropic') {
      const response = await anthropic.messages.create({
        model,
        max_tokens: options.maxTokens ?? 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });
      const inputTokens = response.usage.input_tokens;
      const outputTokens = response.usage.output_tokens;
      const contentBlock = response.content[0];
      result = {
        content: contentBlock.type === 'text' ? contentBlock.text : '',
        provider: 'anthropic',
        model,
        inputTokens,
        outputTokens,
        estimatedCostUsd: calculateCost(model, inputTokens, outputTokens),
        durationMs: Date.now() - startTime,
      };
    } else {
      const response = await groq.chat.completions.create({
        model,
        max_tokens: options.maxTokens ?? 2000,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      });
      const inputTokens = response.usage?.prompt_tokens ?? 0;
      const outputTokens = response.usage?.completion_tokens ?? 0;
      result = {
        content: response.choices[0]?.message?.content ?? '',
        provider: 'groq',
        model,
        inputTokens,
        outputTokens,
        estimatedCostUsd: calculateCost(model, inputTokens, outputTokens),
        durationMs: Date.now() - startTime,
      };
    }
  } catch (primaryError) {
    if (!options.isFallback) {
      // Respect explicitly requested providers (e.g. force Groq in compare/intelligence).
      // If a forced provider fails, surface that exact error instead of falling back.
      if (options.forceProvider) {
        throw primaryError;
      }
      logger.warn('Primary AI provider failed, trying fallback', {
        provider,
        model,
        error: String(primaryError),
      });
      const hasOpenAiKey = Boolean(openAiApiKey);
      const hasAnthropic = Boolean(anthropicApiKey);
      const fallbackProvider: AIProvider =
        provider === 'groq'
          ? (hasAnthropic ? 'anthropic' : 'openai')
          : provider === 'anthropic'
            ? (hasOpenAiKey ? 'openai' : 'groq')
            : (hasGroqKey ? 'groq' : 'anthropic');
      const fallbackModel =
        fallbackProvider === 'openai'
          ? 'gpt-4o-mini'
          : fallbackProvider === 'anthropic'
            ? 'claude-3-haiku-20240307'
            : 'llama-3.3-70b-versatile';
      return runAI(task, systemPrompt, userPrompt, {
        ...options,
        forceProvider: fallbackProvider,
        forceModel: fallbackModel,
        isFallback: true,
      });
    }
    throw primaryError;
  }

  // Persist usage asynchronously — never block on this
  void connectDB()
    .then(() =>
      UsageLog.create({
        userId: options.userId,
        documentId: options.documentId,
        action: task,
        provider: result.provider,
        model: result.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        totalTokens: result.inputTokens + result.outputTokens,
        estimatedCostUsd: result.estimatedCostUsd,
        durationMs: result.durationMs,
        success: true,
      })
    )
    .catch((e) => logger.error('Failed to log AI usage', { error: String(e) }));

  logger.info('AI call completed', {
    task,
    provider: result.provider,
    model: result.model,
    tokens: result.inputTokens + result.outputTokens,
    cost: `$${result.estimatedCostUsd.toFixed(6)}`,
    ms: result.durationMs,
  });

  return result;
}

function mapTaskType(taskType: string): TaskType {
  if (taskType.includes('summary')) return 'summarize';
  if (taskType.includes('entity')) return 'extract';
  if (taskType.includes('classif')) return 'classify';
  if (taskType.includes('fraud') || taskType.includes('anomaly')) return 'anomaly';
  return 'chat';
}

function selectModelForEnhanced(options: {
  documentLength: number;
  taskType: string;
  documentType?: string;
  requiresAccuracy?: boolean;
}): SmartSelection {
  const complexity: 'low' | 'medium' | 'high' =
    options.documentLength < 3000 ? 'low' : options.documentLength < 12000 ? 'medium' : 'high';
  const mappedTask = mapTaskType(options.taskType);
  const selected = selectModel(mappedTask, options.requiresAccuracy ? 'high' : complexity, options.documentType);

  return {
    provider: selected.provider,
    model: selected.model,
    estimatedCost: providerCostPerMillion[selected.provider],
    reasoning: `Selected ${selected.provider}/${selected.model} for ${options.taskType} (${complexity} complexity)`,
  };
}

function recordUsage(provider: AIProvider, tokens: number, cost: number): void {
  routerStats[provider].requests += 1;
  routerStats[provider].tokens += tokens;
  routerStats[provider].cost += cost;
}

function getStats() {
  return {
    providers: routerStats,
    totalRequests: routerStats.openai.requests + routerStats.anthropic.requests + routerStats.groq.requests,
    totalTokens: routerStats.openai.tokens + routerStats.anthropic.tokens + routerStats.groq.tokens,
    totalCost: routerStats.openai.cost + routerStats.anthropic.cost + routerStats.groq.cost,
  };
}

const ModelRouter = {
  selectModel: selectModelForEnhanced,
  recordUsage,
  getStats,
};

export default ModelRouter;
