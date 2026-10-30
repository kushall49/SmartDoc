/**
 * Audit Trail Service (PostgreSQL + Prisma)
 * Single-path audit logging directly into PostgreSQL audit_logs table.
 */
import { prisma } from '@/lib/db';
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
  id: string;
  userId: string;
  action: string;
  resourceId?: string | null;
  resourceType?: string | null;
  metadata?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  success: boolean;
  error?: string | null;
  duration?: number | null;
  createdAt: Date;
}

/**
 * Log an audit event directly in PostgreSQL
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
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resourceId: options.resourceId,
        resourceType: options.resourceType,
        metadata: (options.metadata as any) || {},
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        success: options.success ?? true,
        error: options.error,
        duration: options.duration,
      },
    });
  } catch (err) {
    logger.error('Audit log write failed (non-critical)', { error: String(err) });
  }
}

/**
 * Get audit trail for a user
 */
export async function getUserAuditTrail(
  userId: string,
  options: {
    action?: string;
    limit?: number;
    skip?: number;
  } = {}
): Promise<{ entries: AuditEntry[]; total: number }> {
  const where: any = { userId };
  if (options.action) where.action = options.action;

  const [entries, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options.limit || 50,
      skip: options.skip || 0,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { entries, total };
}
