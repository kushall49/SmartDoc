import mongoose, { Schema, Model } from 'mongoose';
import { ChatMessage } from '@/types';

const ChatMessageSchema = new Schema<ChatMessage>(
  {
    documentId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    context: {
      type: [String],
      default: [],
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

// Index for efficient chat history queries
ChatMessageSchema.index({ documentId: 1, createdAt: 1 });
ChatMessageSchema.index({ userId: 1, createdAt: -1 });

const ChatMessageModel: Model<ChatMessage> = 
  mongoose.models.ChatMessage || mongoose.model<ChatMessage>('ChatMessage', ChatMessageSchema);

export default ChatMessageModel;
