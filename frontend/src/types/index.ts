export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface DocumentItem {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  status: 'uploading' | 'pending' | 'processing' | 'ready' | 'failed';
  documentType?: string;
  pageCount?: number;
  rawText?: string;
  summary?: string;
  entities?: Record<string, any> | any[];
  keywords?: string[];
  anomalies?: string[];
  tokensUsed?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Citation {
  documentId: string;
  documentName: string;
  chunkText: string;
  page?: number;
  similarity: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Citation[];
  createdAt: string;
}

export interface SearchResultItem {
  documentId: string;
  documentName: string;
  documentType: string;
  createdAt?: string;
  keywords: string[];
  chunkText: string;
  pageNumber?: number | null;
  score: number;
}

export interface ComparisonDiff {
  section: string;
  doc1Content: string;
  doc2Content: string;
  significance: 'high' | 'medium' | 'low';
}

export interface ComparisonResult {
  summary: string;
  similarityScore: number;
  differences: ComparisonDiff[];
  keyDifferences?: string[];
  riskAnalysis?: {
    riskLevel: 'low' | 'medium' | 'high';
    details: string[];
  };
}

export interface VisionResult {
  description: string;
  extractedText?: string;
  diagrams?: string[];
  tables?: any[];
  labels?: string[];
}

export interface IntelligenceReport {
  summary: string;
  documentCount: number;
  patterns: Array<{
    theme: string;
    description: string;
    documentsInvolved: string[];
  }>;
  contradictions: Array<{
    issue: string;
    explanation: string;
    conflictingDocuments: string[];
  }>;
  complianceFlags: Array<{
    flag: string;
    severity: 'low' | 'medium' | 'high';
    details: string;
  }>;
  recommendations: string[];
}

export interface AuditLogItem {
  id: string;
  action: string;
  resourceId?: string | null;
  resourceType?: string | null;
  metadata?: any;
  duration?: number | null;
  success: boolean;
  createdAt: string;
}

export interface UsageAnalytics {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCostUsd: number;
  requestsCount: number;
  actionBreakdown: Record<string, number>;
  recentLogs: Array<{
    id: string;
    action: string;
    provider: string;
    model: string;
    totalTokens: number;
    estimatedCostUsd: number;
    createdAt: string;
  }>;
}

