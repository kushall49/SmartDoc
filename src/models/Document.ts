import mongoose, { Schema, Model } from 'mongoose';
import { Document, Entity, DocumentMetadata, ProcessingStatus, Embedding } from '@/types';

const EntitySchema = new Schema<Entity>(
  {
    type: {
      type: String,
      enum: ['person', 'organization', 'location', 'date', 'money', 'email', 'phone', 'id', 'other'],
      required: true,
    },
    value: {
      type: String,
      required: true,
    },
    confidence: Number,
    startIndex: Number,
    endIndex: Number,
  },
  { _id: false }
);

const DocumentMetadataSchema = new Schema<DocumentMetadata>(
  {
    pageCount: Number,
    author: String,
    creationDate: Date,
    modificationDate: Date,
    language: String,
    format: String,
  },
  { _id: false }
);

const ProcessingStatusSchema = new Schema<ProcessingStatus>(
  {
    stage: {
      type: String,
      enum: ['uploaded', 'processing', 'completed', 'failed'],
      default: 'uploaded',
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    message: String,
    startedAt: Date,
    completedAt: Date,
    error: String,
  },
  { _id: false }
);

const EmbeddingSchema = new Schema<Embedding>(
  {
    vector: {
      type: [Number],
      required: true,
    },
    model: {
      type: String,
      required: true,
    },
    chunkIndex: {
      type: Number,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const DocumentSchema = new Schema<Document>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    filename: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    s3Key: {
      type: String,
      required: true,
      unique: true,
    },
    s3Url: {
      type: String,
      required: true,
    },
    status: {
      type: ProcessingStatusSchema,
      default: () => ({
        stage: 'uploaded',
        progress: 0,
      }),
    },
    extractedText: {
      type: String,
      default: null,
    },
    summary: {
      type: String,
      default: null,
    },
    documentType: {
      type: String,
      default: null,
    },
    entities: {
      type: [EntitySchema],
      default: [],
    },
    metadata: {
      type: DocumentMetadataSchema,
      default: null,
    },
    embeddings: {
      type: [EmbeddingSchema],
      default: [],
    },
    anomalyScore: {
      type: Number,
      default: null,
    },
    anomalyDetails: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret) => {
        (ret as any).id = ret._id;
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

// Indexes for efficient queries
DocumentSchema.index({ userId: 1, createdAt: -1 });
DocumentSchema.index({ 'status.stage': 1 });
DocumentSchema.index({ documentType: 1 });
DocumentSchema.index({ createdAt: -1 });

// Text search index for filename and extracted text
DocumentSchema.index({ 
  originalName: 'text', 
  extractedText: 'text',
  summary: 'text' 
});

// Prevent model recompilation in development
const DocumentModel: Model<Document> = mongoose.models.Document || mongoose.model<Document>('Document', DocumentSchema);

export default DocumentModel;
