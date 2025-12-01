import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️ OPENAI_API_KEY not configured. AI features will be unavailable.');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export const OPENAI_CONFIG = {
  model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
  embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
  maxTokens: 4096,
  temperature: 0.3, // Lower temperature for more consistent results
};

export default openai;
