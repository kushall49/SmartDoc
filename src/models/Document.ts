import mongoose, { Schema, Document as MongoDocument, model, models } from 'mongoose';
import type { Embedding } from '@/types';

export type DocumentStatus = 'pending' | 'uploading' | 'processing' | 'ready' | 'failed';
export type DocumentType =
  | 'invoice'
  | 'contract'
  | 'resume'
  | 'report'
  | 'image'
  | 'legal'
  | 'other';

export interface ExtractedEntity {
  type: string;
  value: string;
  confidence: number;
  page?: number;
}

export interface IDocument extends MongoDocument {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  s3Key: string;
  s3Url: string;
  status: DocumentStatus;
  errorMessage?: string;
  documentType?: DocumentType;
  pageCount?: number;
  language?: string;
  rawText?: string;
  summary?: string;
  entities: ExtractedEntity[];
  keywords: string[];
  processingJobId?: string;
  processingStartedAt?: Date;
  processingCompletedAt?: Date;
  aiProvider?: string;
  aiModel?: string;
  tokensUsed?: number;
  anomalies: string[];
  // Legacy field support
  fileType?: string;
  fileSize?: number;
  filename?: string;
  extractedText?: string;
  fraudScore?: number;
  fraudIndicators?: string[];
  /** Chunk embeddings for semantic search / RAG */
  embeddings?: Embedding[];
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema = new Schema<IDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true, default: 0 },
    s3Key: { type: String, required: true },
    s3Url: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'uploading', 'processing', 'ready', 'failed'],
      default: 'pending',
    },
    errorMessage: { type: String },
    documentType: {
      type: String,
      enum: ['invoice', 'contract', 'resume', 'report', 'image', 'legal', 'other'],
    },
    pageCount: { type: Number },
    language: { type: String },
    rawText: { type: String, select: false },
    summary: { type: String },
    entities: [
      {
        type: { type: String },
        value: { type: String },
        confidence: { type: Number },
        page: { type: Number },
      },
    ],
    keywords: [{ type: String }],
    processingJobId: { type: String },
    processingStartedAt: { type: Date },
    processingCompletedAt: { type: Date },
    aiProvider: { type: String },
    aiModel: { type: String },
    tokensUsed: { type: Number },
    anomalies: [{ type: String }],
    // Legacy compatibility fields
    fileType: { type: String },
    fileSize: { type: Number },
    filename: { type: String },
    extractedText: { type: String, select: false },
    fraudScore: { type: Number },
    fraudIndicators: [{ type: String }],
    embeddings: [
      {
        vector: [{ type: Number }],
        model: { type: String },
        chunkIndex: { type: Number },
        text: { type: String },
      },
    ],
  },
  { timestamps: true }
);

DocumentSchema.index({ userId: 1, createdAt: -1 });
DocumentSchema.index({ userId: 1, status: 1 });
DocumentSchema.index({ userId: 1, documentType: 1 });
DocumentSchema.index({ s3Key: 1 });

export const DocumentModel =
  (models.Document as mongoose.Model<IDocument>) ??
  model<IDocument>('Document', DocumentSchema);
