import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { UsageLog } from '@/models/UsageLog';
import { DocumentModel } from '@/models/Document';
import { ok, unauthorized, serverError } from '@/lib/api-response';
import mongoose from 'mongoose';

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorized();

    await connectDB();
    const userId = new mongoose.Types.ObjectId(session.user.id);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [logs, docStats] = await Promise.all([
      UsageLog.find({ userId, createdAt: { $gte: thirtyDaysAgo } })
        .sort({ createdAt: -1 })
        .limit(500)
        .lean(),
      DocumentModel.aggregate<{ _id: string; count: number }>([
        { $match: { userId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const totalCost = logs.reduce((s, l) => s + (l.estimatedCostUsd ?? 0), 0);
    const totalTokens = logs.reduce((s, l) => s + (l.totalTokens ?? 0), 0);

    const byProvider: Record<string, number> = {};
    const byAction: Record<string, number> = {};
    const dailyCost: Record<string, number> = {};
    const recentCalls: Array<{
      id: string;
      action: string;
      provider: string;
      model: string;
      tokens: number;
      cost: string;
      ms: number;
      date: string;
    }> = [];

    for (const l of logs) {
      byProvider[l.provider] = (byProvider[l.provider] ?? 0) + (l.totalTokens ?? 0);
      byAction[l.action] = (byAction[l.action] ?? 0) + 1;
      const day = new Date(l.createdAt).toISOString().slice(0, 10);
      dailyCost[day] = (dailyCost[day] ?? 0) + (l.estimatedCostUsd ?? 0);

      if (recentCalls.length < 20) {
        recentCalls.push({
          id: l._id.toString(),
          action: l.action,
          provider: l.provider,
          model: l.model,
          tokens: l.totalTokens,
          cost: `$${(l.estimatedCostUsd ?? 0).toFixed(6)}`,
          ms: l.durationMs,
          date: new Date(l.createdAt).toISOString(),
        });
      }
    }

    // Cost savings: compare actual vs if everything was gpt-4o ($0.005/$0.015 per 1K)
    const hypotheticalCostAllGpt4o =
      (totalTokens / 1000) * ((0.005 + 0.015) / 2);
    const costSavings = Math.max(0, hypotheticalCostAllGpt4o - totalCost);

    return ok({
      totalCost: Math.round(totalCost * 100000) / 100000,
      totalTokens,
      totalCalls: logs.length,
      costSavings: Math.round(costSavings * 100000) / 100000,
      byProvider,
      byAction,
      dailyCost,
      recentCalls,
      documentStats: Object.fromEntries(
        docStats.map((d) => [d._id ?? 'unknown', d.count])
      ),
    });
  } catch (e) {
    return serverError(e);
  }
}
