import mongoose, { Schema, model, models } from 'mongoose';

export type UsageAction =
  | 'ocr'
  | 'summarize'
  | 'extract'
  | 'classify'
  | 'embed'
  | 'chat'
  | 'search'
  | 'compare'
  | 'intelligence'
  | 'vision'
  | 'anomaly';

export interface IUsageLog {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  documentId?: mongoose.Types.ObjectId;
  action: UsageAction;
  provider: 'openai' | 'anthropic' | 'groq';
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  durationMs: number;
  success: boolean;
  errorMessage?: string;
  createdAt: Date;
}

const UsageLogSchema = new Schema<IUsageLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    documentId: { type: Schema.Types.ObjectId, ref: 'Document' },
    action: {
      type: String,
      enum: [
        'ocr', 'summarize', 'extract', 'classify', 'embed',
        'chat', 'search', 'compare', 'intelligence', 'vision', 'anomaly',
      ],
      required: true,
    },
    provider: { type: String, enum: ['openai', 'anthropic', 'groq'], required: true },
    model: { type: String, required: true },
    inputTokens: { type: Number, required: true, default: 0 },
    outputTokens: { type: Number, required: true, default: 0 },
    totalTokens: { type: Number, required: true, default: 0 },
    estimatedCostUsd: { type: Number, required: true, default: 0 },
    durationMs: { type: Number, required: true, default: 0 },
    success: { type: Boolean, required: true },
    errorMessage: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

UsageLogSchema.index({ userId: 1, createdAt: -1 });
UsageLogSchema.index({ createdAt: -1 });
UsageLogSchema.index({ action: 1, createdAt: -1 });

export const UsageLog =
  (models.UsageLog as mongoose.Model<IUsageLog>) ??
  model<IUsageLog>('UsageLog', UsageLogSchema);
