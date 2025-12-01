// TypeScript types for the application

export interface User {
  _id: string;
  name: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

export interface Entity {
  type: 'person' | 'organization' | 'location' | 'date' | 'money' | 'email' | 'phone' | 'id' | 'other';
  value: string;
  confidence?: number;
  startIndex?: number;
  endIndex?: number;
}

export interface DocumentMetadata {
  pageCount?: number;
  author?: string;
  creationDate?: Date;
  modificationDate?: Date;
  language?: string;
  format?: string;
}

export interface ProcessingStatus {
  stage: 'uploaded' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  message?: string;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface Embedding {
  vector: number[];
  model: string;
  chunkIndex: number;
  text: string;
}

export interface Document {
  _id: string;
  userId: string;
  filename: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  s3Key: string;
  s3Url: string;
  
  // Processing status
  status: ProcessingStatus;
  
  // Extracted data
  extractedText?: string;
  summary?: string;
  documentType?: string;
  entities?: Entity[];
  metadata?: DocumentMetadata;
  
  // Embeddings for RAG
  embeddings?: Embedding[];
  
  // Anomaly detection
  anomalyScore?: number;
  anomalyDetails?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  _id: string;
  documentId: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  context?: string[]; // Retrieved chunks used for the response
  createdAt: Date;
}

export interface SearchQuery {
  query: string;
  userId: string;
  results: string[]; // Document IDs
  resultCount: number;
  executionTime: number;
  createdAt: Date;
}
