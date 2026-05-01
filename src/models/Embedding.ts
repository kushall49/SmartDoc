import mongoose, { Schema, Document, model, models } from 'mongoose';

export interface IEmbedding extends Document {
  _id: mongoose.Types.ObjectId;
  documentId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  chunkIndex: number;
  chunkText: string;
  chunkTokens: number;
  pageNumber?: number;
  embedding: number[];
  createdAt: Date;
}

const EmbeddingSchema = new Schema<IEmbedding>(
  {
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    chunkIndex: { type: Number, required: true },
    chunkText: { type: String, required: true },
    chunkTokens: { type: Number, required: true, default: 0 },
    pageNumber: { type: Number },
    embedding: { type: [Number], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

EmbeddingSchema.index({ documentId: 1, chunkIndex: 1 });
EmbeddingSchema.index({ userId: 1 });
EmbeddingSchema.index({ documentId: 1 });

export const Embedding =
  (models.Embedding as mongoose.Model<IEmbedding>) ??
  model<IEmbedding>('Embedding', EmbeddingSchema);
