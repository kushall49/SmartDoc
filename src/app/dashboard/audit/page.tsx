'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Shield, Loader2, RefreshCw, Clock, BarChart3 } from 'lucide-react';

interface AuditEntry {
  _id: string;
  action: string;
  resourceId?: string;
  resourceType?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  duration?: number;
  createdAt: string;
}

interface UsageSummary {
  totalRequests: number;
  totalTokensUsed: number;
  totalCostEstimate: number;
  byProvider: Record<string, { requests: number; tokens: number; cost: number }>;
  byAction: Record<string, number>;
}

const actionColor: Record<string, string> = {
  'document.upload': 'bg-blue-100 text-blue-700',
  'document.delete': 'bg-red-100 text-red-700',
  'document.process': 'bg-purple-100 text-purple-700',
  'ai.vision-analyze': 'bg-yellow-100 text-yellow-700',
  'ai.compare': 'bg-orange-100 text-orange-700',
  'ai.cross-intelligence': 'bg-pink-100 text-pink-700',
  'ai.chat': 'bg-green-100 text-green-700',
  'search.query': 'bg-gray-100 text-gray-700',
  'auth.login': 'bg-cyan-100 text-cyan-700',
};

export default function AuditTrailPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [tab, setTab] = useState<'trail' | 'usage'>('trail');
  const limit = 20;

  const load = useCallback(async (offset: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/audit?limit=${limit}&skip=${offset}`);
      const data = await res.json();
      if (data.success) {
        setEntries(data.entries);
        setTotal(data.pagination.total);
      }
    } catch (_err) {
      // silently fail on load error
    }
    finally { setLoading(false); }
  }, []);

  const loadUsage = useCallback(async () => {
    const res = await fetch('/api/audit?mode=usage&days=30');
    const data = await res.json();
    if (data.success) setUsage(data.summary);
  }, []);

  useEffect(() => { load(0); }, [load]);
  useEffect(() => { if (tab === 'usage') loadUsage(); }, [tab, loadUsage]);

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-green-600" />
            Audit Trail
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Full history of actions across your account — {total} total events.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => load(skip)}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        {(['trail', 'usage'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-sm border capitalize transition-colors ${
              tab === t ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-600'
            }`}
          >
            {t === 'trail' ? 'Audit Log' : 'AI Usage Summary'}
          </button>
        ))}
      </div>

      {/* Audit Trail Tab */}
      {tab === 'trail' && (
        <Card>
          <CardContent className="pt-4">
            {loading ? (
              <div className="flex items-center gap-2 py-8 justify-center text-gray-400">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading audit log…
              </div>
            ) : entries.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">No audit events recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {entries.map((entry, i) => (
                  <div key={entry._id || i}>
                    <div className="flex items-start justify-between gap-4 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge
                          className={`text-xs shrink-0 ${actionColor[entry.action] ?? 'bg-gray-100 text-gray-700'}`}
                        >
                          {entry.action}
                        </Badge>
                        {entry.resourceType && (
                          <span className="text-xs text-gray-500 shrink-0">{entry.resourceType}</span>
                        )}
                        {entry.resourceId && (
                          <span className="text-xs font-mono text-gray-400 truncate max-w-[120px]">
                            {entry.resourceId}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400 shrink-0">
                        {entry.duration && (
                          <span className="flex items-center gap-0.5">
                            <Clock className="h-3 w-3" />
                            {entry.duration}ms
                          </span>
                        )}
                        <span>{formatTime(entry.createdAt)}</span>
                      </div>
                    </div>
                    {i < entries.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {total > limit && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <Button
                  variant="outline" size="sm"
                  disabled={skip === 0 || loading}
                  onClick={() => { setSkip(s => s - limit); load(skip - limit); }}
                >
                  Previous
                </Button>
                <span className="text-xs text-gray-500">
                  {skip + 1}–{Math.min(skip + limit, total)} of {total}
                </span>
                <Button
                  variant="outline" size="sm"
                  disabled={skip + limit >= total || loading}
                  onClick={() => { setSkip(s => s + limit); load(skip + limit); }}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Usage Summary Tab */}
      {tab === 'usage' && usage && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card><CardContent className="pt-4">
              <div className="text-3xl font-bold">{usage.totalRequests}</div>
              <p className="text-xs text-gray-500">AI Requests (30d)</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4">
              <div className="text-3xl font-bold text-blue-600">
                {(usage.totalTokensUsed / 1000).toFixed(1)}K
              </div>
              <p className="text-xs text-gray-500">Tokens Used</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4">
              <div className="text-3xl font-bold text-green-600">
                ${usage.totalCostEstimate.toFixed(4)}
              </div>
              <p className="text-xs text-gray-500">Estimated Cost</p>
            </CardContent></Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                By Action Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.entries(usage.byAction)
                .sort(([, a], [, b]) => b - a)
                .map(([action, count]) => (
                  <div key={action} className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-600 w-40 truncate">{action}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-green-500 h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, (count / usage.totalRequests) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-gray-500 w-8 text-right">{count}</span>
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
