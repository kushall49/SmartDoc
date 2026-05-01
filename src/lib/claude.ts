import Anthropic from '@anthropic-ai/sdk';

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('⚠️ ANTHROPIC_API_KEY not configured. Claude features will be unavailable.');
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export const CLAUDE_CONFIG = {
  model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
  maxTokens: 4096,
  temperature: 0.3,
  
  // Model capabilities
  modelCapabilities: {
    'claude-3-5-sonnet-20241022': {
      contextWindow: 200000,
      costPerMToken: 3.0,
      speed: 'fast',
      strengths: ['document-analysis', 'structured-extraction', 'long-context'],
    },
    'claude-3-5-haiku-20241022': {
      contextWindow: 200000,
      costPerMToken: 0.8,
      speed: 'very-fast',
      strengths: ['quick-tasks', 'simple-extraction'],
    },
    'claude-3-opus-20240229': {
      contextWindow: 200000,
      costPerMToken: 15.0,
      speed: 'medium',
      strengths: ['complex-reasoning', 'high-accuracy'],
    },
  },
};

export default anthropic;
