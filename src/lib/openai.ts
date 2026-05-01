import OpenAI from 'openai';

const isGroq = process.env.GROQ_API_KEY || (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('gsk_'));

if (!process.env.OPENAI_API_KEY && !process.env.GROQ_API_KEY) {
  console.warn('⚠️ OPENAI_API_KEY or GROQ_API_KEY not configured. AI features will be unavailable.');
}

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || '',
  baseURL: isGroq ? 'https://api.groq.com/openai/v1' : undefined,
});

export const OPENAI_CONFIG = {
  model: isGroq ? 'llama-3.3-70b-versatile' : (process.env.OPENAI_MODEL || 'gpt-4o'), // Updated default
  embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-large', // Updated default
  fallbackModel: isGroq ? 'llama-3.1-8b-instant' : (process.env.OPENAI_FALLBACK_MODEL || 'gpt-4o-mini'), // For simple tasks
  maxTokens: 4096,
  temperature: 0.3, // Lower temperature for more consistent results
  
  // Model-specific configurations
  modelCapabilities: {
    'llama-3.3-70b-versatile': { contextWindow: 128000, costPerMToken: 0.70, speed: 'fast' },
    'llama-3.1-8b-instant': { contextWindow: 128000, costPerMToken: 0.10, speed: 'very-fast' },
    'gpt-4o': { contextWindow: 128000, costPerMToken: 5.0, speed: 'fast' },
    'gpt-4o-mini': { contextWindow: 128000, costPerMToken: 0.15, speed: 'very-fast' },
    'gpt-4-turbo-preview': { contextWindow: 128000, costPerMToken: 10.0, speed: 'medium' },
    'o1-preview': { contextWindow: 128000, costPerMToken: 15.0, speed: 'slow' },
  },
};

export default openai;
