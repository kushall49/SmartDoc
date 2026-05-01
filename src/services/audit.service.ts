/**
 * Audit Trail Service
 * Every AI operation, document access, and change is logged
 * with full traceability. This is critical for:
 * - Enterprise compliance (SOC2, GDPR, HIPAA)
 * - Debugging production issues
 * - Security incident response
 * - Usage billing
 * - User trust
 */

import mongoose, { Schema, Model } from 'mongoose';
import { logger } from '@/lib/logger';

export type AuditAction =
  | 'document.upload'
  | 'document.view'
  | 'document.delete'
  | 'document.process'
  | 'ai.summarize'
  | 'ai.extract-entities'
  | 'ai.classify'
  | 'ai.fraud-detect'
  | 'ai.vision-analyze'
  | 'ai.compare'
  | 'ai.cross-intelligence'
  | 'chat.message'
  | 'chat.stream'
  | 'search.query'
  | 'auth.login'
  | 'auth.logout'
  | 'auth.register';

export interface AuditEntry {
  _id: string;
  userId: string;
  action: AuditAction;
  resourceId?: string;       // document ID, chat ID, etc.
  resourceType?: string;     // 'document', 'chat', etc.
  metadata?: Record<string, unknown>; // provider used, tokens, cost, etc.
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  error?: string;
  duration?: number;         // ms
  createdAt: Date;
}

// Mongoose Schema
const AuditSchema = new Schema<AuditEntry>(
  {
    userId: { type: String, required: true, index: true },
    action: { type: String, required: true, index: true },
    resourceId: String,
    resourceType: String,
    metadata: Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String,
    success: { type: Boolean, default: true },
    error: String,
    duration: Number,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    capped: { size: 104857600, max: 50000 }, // 100MB rolling cap
  }
);

// Compound indexes for fast querying
AuditSchema.index({ userId: 1, createdAt: -1 });
AuditSchema.index({ action: 1, createdAt: -1 });
AuditSchema.index({ userId: 1, action: 1, createdAt: -1 });

const AuditModel: Model<AuditEntry> =
  mongoose.models.AuditLog || mongoose.model<AuditEntry>('AuditLog', AuditSchema);

export default AuditModel;

/**
 * Log an audit event
 */
export async function logAuditEvent(
  userId: string,
  action: AuditAction,
  options: {
    resourceId?: string;
    resourceType?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    success?: boolean;
    error?: string;
    duration?: number;
  } = {}
): Promise<void> {
  try {
    await AuditModel.create({
      userId,
      action,
      resourceId: options.resourceId,
      resourceType: options.resourceType,
      metadata: options.metadata,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      success: options.success ?? true,
      error: options.error,
      duration: options.duration,
    });
  } catch (err) {
    // Audit logging must NEVER break the main flow
    logger.error('Audit log write failed (non-critical)', { error: String(err) });
  }
}

/**
 * Get audit trail for a user
 */
export async function getUserAuditTrail(
  userId: string,
  options: {
    action?: AuditAction;
    limit?: number;
    skip?: number;
    fromDate?: Date;
    toDate?: Date;
  } = {}
): Promise<{ entries: AuditEntry[]; total: number }> {
  const query: Record<string, unknown> = { userId };
  if (options.action) query.action = options.action;
  if (options.fromDate || options.toDate) {
    query.createdAt = {};
    if (options.fromDate) (query.createdAt as Record<string, unknown>)['$gte'] = options.fromDate;
    if (options.toDate) (query.createdAt as Record<string, unknown>)['$lte'] = options.toDate;
  }

  const [entries, total] = await Promise.all([
    AuditModel.find(query)
      .sort({ createdAt: -1 })
      .limit(options.limit || 50)
      .skip(options.skip || 0),
    AuditModel.countDocuments(query),
  ]);

  return { entries, total };
}

/**
 * Get usage summary for a user (for AI cost tracking)
 */
export async function getUserUsageSummary(userId: string, days = 30) {
  const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const aiActions: AuditAction[] = [
    'ai.summarize', 'ai.extract-entities', 'ai.classify',
    'ai.fraud-detect', 'ai.vision-analyze', 'ai.compare', 'ai.cross-intelligence',
  ];

  const entries = await AuditModel.find({
    userId,
    action: { $in: aiActions },
    createdAt: { $gte: fromDate },
    success: true,
  }).select('action metadata duration createdAt');

  const summary = {
    totalAIOperations: entries.length,
    totalTokensUsed: 0,
    estimatedCost: 0,
    averageResponseTime: 0,
    byAction: {} as Record<string, { count: number; tokens: number; cost: number }>,
  };

  for (const entry of entries) {
    const tokens = (entry.metadata?.tokens as number) || 0;
    const cost = (entry.metadata?.cost as number) || 0;

    summary.totalTokensUsed += tokens;
    summary.estimatedCost += cost;
    summary.averageResponseTime += entry.duration || 0;

    if (!summary.byAction[entry.action]) {
      summary.byAction[entry.action] = { count: 0, tokens: 0, cost: 0 };
    }
    summary.byAction[entry.action].count++;
    summary.byAction[entry.action].tokens += tokens;
    summary.byAction[entry.action].cost += cost;
  }

  if (entries.length > 0) {
    summary.averageResponseTime = Math.round(summary.averageResponseTime / entries.length);
  }

  return summary;
}
