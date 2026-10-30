import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️ OPENAI_API_KEY is not set. OpenAI features will fail.');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export const OPENAI_CONFIG = {
  // Standard models for all document intelligence tasks
  model: process.env.OPENAI_MODEL || 'gpt-4o',
  fastModel: process.env.OPENAI_FAST_MODEL || 'gpt-4o-mini',
  embeddingModel: 'text-embedding-3-small',
  embeddingDimensions: 1536,
  temperature: 0.5,
  maxTokens: 4096,
};

export default openai;
