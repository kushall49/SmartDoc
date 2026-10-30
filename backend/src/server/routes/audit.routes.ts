import { Router, Request, Response } from 'express';
import { prisma } from '@/lib/db';
import { requireAuth } from '../middleware/auth.middleware';
import { AuthenticatedRequest } from '../types';

const router = Router();
router.use(requireAuth);

/**
 * GET /api/audit - Fetch audit trail for the current user
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const limit = Math.min(100, parseInt((req.query.limit as string) || '50'));

    const logs = await prisma.auditLog.findMany({
      where: { userId: authReq.user.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.status(200).json({ success: true, logs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/analytics - Fetch token usage and cost metrics
 */
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;

    const usageLogs = await prisma.usageLog.findMany({
      where: { userId: authReq.user.id },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const totalInputTokens = usageLogs.reduce((sum, log) => sum + log.inputTokens, 0);
    const totalOutputTokens = usageLogs.reduce((sum, log) => sum + log.outputTokens, 0);
    const totalTokens = totalInputTokens + totalOutputTokens;
    const totalCostUsd = usageLogs.reduce((sum, log) => sum + log.estimatedCostUsd, 0);

    // Group by action
    const actionCounts: Record<string, number> = {};
    usageLogs.forEach((log) => {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
    });

    res.status(200).json({
      success: true,
      analytics: {
        totalInputTokens,
        totalOutputTokens,
        totalTokens,
        totalCostUsd: Math.round(totalCostUsd * 10000) / 10000,
        requestsCount: usageLogs.length,
        actionBreakdown: actionCounts,
        recentLogs: usageLogs.slice(0, 10),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/audit/export - Export audit logs as CSV or JSON
 */
router.get('/export', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const format = ((req.query.format as string) || 'json').toLowerCase();

    const logs = await prisma.auditLog.findMany({
      where: { userId: authReq.user.id },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    const filename = `audit_logs_${new Date().toISOString().slice(0, 10)}`;

    if (format === 'csv') {
      const csvHeader = 'ID,Action,ResourceType,ResourceId,Success,DurationMs,CreatedAt\n';
      const rows = logs.map(
        (l) =>
          `"${l.id}","${l.action}","${l.resourceType || ''}","${l.resourceId || ''}",${l.success},${l.duration || 0},"${l.createdAt.toISOString()}"`
      );
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send(csvHeader + rows.join('\n'));
      return;
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
    res.send(JSON.stringify(logs, null, 2));
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

