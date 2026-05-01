import mongoose, { Schema, Document, model, models } from 'mongoose';

export interface ChatMessageEntry {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{
    documentId: string;
    documentName?: string;
    chunkText: string;
    page?: number;
    similarity?: number;
  }>;
  tokensUsed?: number;
  provider?: string;
  model?: string;
  createdAt: Date;
}

export interface IChat extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  documentId: mongoose.Types.ObjectId;
  title: string;
  messages: ChatMessageEntry[];
  totalTokensUsed: number;
  createdAt: Date;
  updatedAt: Date;
}

const ChatSchema = new Schema<IChat>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true },
    title: { type: String, required: true, default: 'New Chat', maxlength: 120 },
    messages: [
      {
        role: { type: String, enum: ['user', 'assistant'], required: true },
        content: { type: String, required: true, maxlength: 20000 },
        sources: [
          {
            documentId: { type: String },
            documentName: { type: String },
            chunkText: { type: String },
            page: { type: Number },
            similarity: { type: Number },
          },
        ],
        tokensUsed: { type: Number },
        provider: { type: String },
        model: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    totalTokensUsed: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ChatSchema.index({ userId: 1, documentId: 1 });
ChatSchema.index({ userId: 1, updatedAt: -1 });

export const Chat =
  (models.Chat as mongoose.Model<IChat>) ?? model<IChat>('Chat', ChatSchema);
