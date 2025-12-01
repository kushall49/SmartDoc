// Application Configuration
export const APP_CONFIG = {
  name: 'SmartDocIQ',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  env: process.env.NODE_ENV || 'development',
};

// File Upload Configuration
export const UPLOAD_CONFIG = {
  maxFileSize: (parseInt(process.env.MAX_FILE_SIZE_MB || '10') * 1024 * 1024), // Convert MB to bytes
  allowedFileTypes: (process.env.ALLOWED_FILE_TYPES || 'pdf,png,jpg,jpeg,docx').split(','),
  allowedMimeTypes: [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
};

// Rate Limiting Configuration
export const RATE_LIMIT_CONFIG = {
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes default
};

// Document Processing Configuration
export const PROCESSING_CONFIG = {
  useAWSTextract: process.env.USE_AWS_TEXTRACT === 'true',
  chunkSize: 1000, // For text chunking in embeddings
  chunkOverlap: 200, // Overlap between chunks
  maxConcurrentJobs: 5,
};

// API Configuration
export const API_CONFIG = {
  timeout: 30000, // 30 seconds
  retries: 3,
};

const config = {
  app: APP_CONFIG,
  upload: UPLOAD_CONFIG,
  rateLimit: RATE_LIMIT_CONFIG,
  processing: PROCESSING_CONFIG,
  api: API_CONFIG,
};

export default config;
