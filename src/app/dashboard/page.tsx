'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Upload, MessageSquare, Search, TrendingUp, Clock, Zap } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface DashboardStats {
  totalDocs: number;
  readyDocs: number;
  processingDocs: number;
  failedDocs: number;
  totalCalls: number;
  totalCost: number;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentDocs, setRecentDocs] = useState<Array<{
    _id: string;
    name: string;
    status: string;
    documentType?: string;
    createdAt: string;
  }>>([]);

  useEffect(() => {
    fetch('/api/documents?limit=5')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setRecentDocs(d.data.documents.slice(0, 5));
      })
      .catch(() => void 0);

    fetch('/api/analytics')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const ds = (d.data.documentStats ?? {}) as Record<string, number>;
          setStats({
            totalDocs: Object.values(ds).reduce((a, b) => a + b, 0),
            readyDocs: ds['ready'] ?? 0,
            processingDocs: (ds['processing'] ?? 0) + (ds['pending'] ?? 0),
            failedDocs: ds['failed'] ?? 0,
            totalCalls: d.data.totalCalls ?? 0,
            totalCost: d.data.totalCost ?? 0,
          });
        }
      })
      .catch(() => void 0);
  }, []);

  const quickActions = [
    { label: 'Upload Document', href: '/dashboard/upload', icon: Upload, cls: 'bg-indigo-600 hover:bg-indigo-500' },
    { label: 'Chat with Doc', href: '/dashboard/chat', icon: MessageSquare, cls: 'bg-violet-600 hover:bg-violet-500' },
    { label: 'Search Docs', href: '/dashboard/search', icon: Search, cls: 'bg-blue-600 hover:bg-blue-500' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          Welcome back{session?.user?.name ? `, ${session.user.name.split(' ')[0]}` : ''}
        </h1>
        <p className="text-slate-400 mt-1 text-sm">Your AI document intelligence dashboard</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Documents', value: String(stats.totalDocs), icon: FileText, sub: `${stats.readyDocs} ready` },
            { label: 'Processing', value: String(stats.processingDocs), icon: Clock, sub: stats.failedDocs > 0 ? `${stats.failedDocs} failed` : 'All good' },
            { label: 'AI Calls', value: String(stats.totalCalls), icon: Zap, sub: 'Last 30 days' },
            { label: 'AI Cost', value: `$${stats.totalCost.toFixed(4)}`, icon: TrendingUp, sub: 'Last 30 days' },
          ].map((s) => (
            <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-xs">{s.label}</span>
                <s.icon size={16} className="text-slate-600" />
              </div>
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          {quickActions.map((a) => (
            <Link key={a.href} href={a.href}
              className={`flex items-center gap-2 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors ${a.cls}`}>
              <a.icon size={16} />
              {a.label}
            </Link>
          ))}
        </div>
      </div>

      {recentDocs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recent Documents</h2>
            <Link href="/dashboard/documents" className="text-xs text-indigo-400 hover:text-indigo-300">View all</Link>
          </div>
          <div className="space-y-2">
            {recentDocs.map((doc) => (
              <Link key={doc._id} href={`/dashboard/documents/${doc._id}`}
                className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 hover:border-slate-700 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText size={15} className="text-indigo-400 shrink-0" />
                  <span className="text-white text-sm font-medium truncate">{doc.name}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                  doc.status === 'ready' ? 'bg-green-500/20 text-green-300' :
                  doc.status === 'failed' ? 'bg-red-500/20 text-red-300' :
                  'bg-yellow-500/20 text-yellow-300'}`}>
                  {doc.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {recentDocs.length === 0 && !stats && (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
          <FileText size={48} className="mx-auto text-slate-700 mb-4" />
          <h3 className="text-slate-300 font-medium mb-2">No documents yet</h3>
          <p className="text-slate-500 text-sm mb-4">Upload your first document to get started</p>
          <Link href="/dashboard/upload"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-2 rounded-lg">
            <Upload size={16} /> Upload Document
          </Link>
        </div>
      )}
    </div>
  );
}
