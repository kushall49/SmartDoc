'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DollarSign, Zap, TrendingDown, FileText, Loader2, RefreshCw } from 'lucide-react';

interface AnalyticsData {
  totalCost: number;
  totalTokens: number;
  totalCalls: number;
  costSavings: number;
  byProvider: Record<string, number>;
  byAction: Record<string, number>;
  dailyCost: Record<string, number>;
  recentCalls: Array<{ id: string; action: string; provider: string; model: string; tokens: number; cost: string; ms: number; date: string }>;
  documentStats: Record<string, number>;
}

const PROVIDER_COLORS: Record<string, string> = { openai: '#6366f1', anthropic: '#a78bfa' };

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function fetchData() {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/analytics');
      const json = await res.json();
      if (json.success) setData(json.data);
      else setError(json.error ?? 'Failed to load');
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    void fetchData();
    const i = setInterval(fetchData, 15000);
    return () => clearInterval(i);
  }, []);

  if (loading && !data) return <div className="flex items-center justify-center py-16"><Loader2 size={32} className="animate-spin text-indigo-400" /></div>;
  if (error) return <div className="text-center py-16"><p className="text-red-400 mb-4">{error}</p><button onClick={fetchData} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">Retry</button></div>;
  if (!data) return null;

  const providerPie = Object.entries(data.byProvider).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value, originalName: name }));
  const actionBar = Object.entries(data.byAction).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  const dailyBar = Object.entries(data.dailyCost).sort((a, b) => a[0].localeCompare(b[0])).slice(-14).map(([date, value]) => ({ date: date.slice(5), cost: Math.round(value * 10000) / 10000 }));

  const cards = [
    { label: 'Total Cost', value: `$${data.totalCost.toFixed(4)}`, sub: 'Last 30 days', icon: DollarSign },
    { label: 'Total Tokens', value: data.totalTokens.toLocaleString(), sub: `${data.totalCalls} calls`, icon: Zap },
    { label: 'Cost Savings', value: `$${data.costSavings.toFixed(4)}`, sub: 'vs. all GPT-4o', icon: TrendingDown },
    { label: 'Documents', value: String(Object.values(data.documentStats).reduce((a, b) => a + b, 0)), sub: `${data.documentStats['ready'] ?? 0} ready`, icon: FileText },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Analytics</h1>
          <p className="text-slate-400 text-sm mt-1">Last 30 days · Auto-refresh every 15s</p>
        </div>
        <button onClick={fetchData} disabled={loading} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((c) => (
          <div key={c.label} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-sm">{c.label}</span>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-indigo-500/20">
                <c.icon size={18} className="text-indigo-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{c.value}</p>
            <p className="text-slate-500 text-xs mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-white font-medium mb-4 text-sm">Daily Cost (USD)</h3>
          {dailyBar.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dailyBar}>
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v}`} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} formatter={(v: number) => [`$${v.toFixed(4)}`, 'Cost']} />
                <Bar dataKey="cost" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-44 flex items-center justify-center text-slate-600 text-sm">No data yet</div>}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-white font-medium mb-4 text-sm">Tokens by Provider</h3>
          {providerPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={providerPie} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" labelLine={false}>
                  {providerPie.map((e) => <Cell key={e.originalName} fill={PROVIDER_COLORS[e.originalName] ?? '#6366f1'} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} formatter={(v: number) => [v.toLocaleString(), 'Tokens']} />
                <Legend formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-44 flex items-center justify-center text-slate-600 text-sm">No data yet</div>}
        </div>
      </div>

      {actionBar.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
          <h3 className="text-white font-medium mb-4 text-sm">Calls by Action</h3>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={actionBar} layout="vertical">
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
              <Bar dataKey="value" fill="#a78bfa" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {data.recentCalls.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800"><h3 className="text-white font-medium text-sm">Recent AI Calls</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-slate-800">
                {['Action', 'Provider', 'Model', 'Tokens', 'Cost', 'ms', 'Date'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-slate-500 font-medium">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {data.recentCalls.map((c) => (
                  <tr key={c.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="px-4 py-2.5 text-slate-300 capitalize">{c.action}</td>
                    <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 capitalize">{c.provider}</span></td>
                    <td className="px-4 py-2.5 text-slate-400 font-mono text-xs">{c.model}</td>
                    <td className="px-4 py-2.5 text-slate-300">{c.tokens.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-green-400">{c.cost}</td>
                    <td className="px-4 py-2.5 text-slate-400">{c.ms}</td>
                    <td className="px-4 py-2.5 text-slate-500">{new Date(c.date).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
