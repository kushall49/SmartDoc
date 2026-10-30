import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { UsageAnalytics } from '../types';
import {
  BarChart3,
  DollarSign,
  Cpu,
  Zap,
  Layers,
  ArrowUpRight,
  Clock,
  Loader2,
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const { data, isLoading } = useQuery<{ success: boolean; analytics: UsageAnalytics }>({
    queryKey: ['analytics'],
    queryFn: () => api.get('/audit/analytics'),
  });

  const analytics = data?.analytics;

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-xs">Computing usage & token analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">AI Usage & Cost Analytics</h1>
        <p className="text-xs text-slate-400 mt-1">
          Real-time tracking of token ingestion, generation counts, and model costs.
        </p>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#10131a] border border-[#232733] space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Estimated Total Cost</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            ${(analytics?.totalCostUsd || 0).toFixed(4)}
          </div>
          <div className="text-[11px] text-slate-500">Calculated across all AI calls</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#10131a] border border-[#232733] space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Total Tokens Used</span>
            <Cpu className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {(analytics?.totalTokens || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500">Input + output token sum</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#10131a] border border-[#232733] space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Input (Prompt) Tokens</span>
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {(analytics?.totalInputTokens || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500">Document chunk & query ingestion</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#10131a] border border-[#232733] space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Output (Completion) Tokens</span>
            <Layers className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {(analytics?.totalOutputTokens || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500">Answers, summaries, entity tags</div>
        </div>
      </div>

      {/* Action Breakdown Grid */}
      <div className="p-6 rounded-2xl bg-[#10131a] border border-[#232733] space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Request Breakdown by Action
        </h2>

        {analytics?.actionBreakdown && Object.keys(analytics.actionBreakdown).length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(analytics.actionBreakdown).map(([action, count]) => (
              <div key={action} className="p-4 rounded-xl bg-[#161922] border border-[#232733] space-y-1">
                <div className="text-[11px] text-slate-400 capitalize">{action.replace(/_/g, ' ')}</div>
                <div className="text-xl font-bold text-white font-mono">{count} calls</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">No AI requests logged yet.</p>
        )}
      </div>

      {/* Recent Usage Logs Table */}
      <div className="p-6 rounded-2xl bg-[#10131a] border border-[#232733] space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Recent AI Invocations
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#232733] text-slate-400 font-semibold">
                <th className="pb-3 px-2">Action</th>
                <th className="pb-3 px-2">Provider & Model</th>
                <th className="pb-3 px-2">Tokens</th>
                <th className="pb-3 px-2">Cost (USD)</th>
                <th className="pb-3 px-2 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2330]">
              {(analytics?.recentLogs || []).map((log) => (
                <tr key={log.id} className="hover:bg-[#151922] transition-colors">
                  <td className="py-3 px-2 font-semibold text-slate-200 capitalize">
                    {log.action.replace(/_/g, ' ')}
                  </td>
                  <td className="py-3 px-2">
                    <span className="font-mono text-[11px] text-indigo-400">
                      {log.provider} / {log.model}
                    </span>
                  </td>
                  <td className="py-3 px-2 font-mono text-slate-300">
                    {log.totalTokens.toLocaleString()}
                  </td>
                  <td className="py-3 px-2 font-mono text-emerald-400">
                    ${log.estimatedCostUsd.toFixed(5)}
                  </td>
                  <td className="py-3 px-2 text-right text-slate-500 text-[11px]">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

