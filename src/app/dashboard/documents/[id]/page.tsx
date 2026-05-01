'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, FileText, MessageSquare, Loader2, AlertCircle,
  Tag, Calendar, Building, DollarSign, MapPin, Hash,
  RefreshCw, AlertTriangle, Cpu,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Entity { type: string; value: string; confidence: number }
interface DocDetail {
  _id: string;
  name: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  status: string;
  documentType?: string;
  pageCount?: number;
  language?: string;
  summary?: string;
  entities?: Entity[];
  keywords?: string[];
  anomalies?: string[];
  aiProvider?: string;
  aiModel?: string;
  tokensUsed?: number;
  errorMessage?: string;
  processingStartedAt?: string;
  processingCompletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const ENTITY_ICONS: Record<string, React.ElementType> = {
  person: Hash, date: Calendar, amount: DollarSign,
  organization: Building, location: MapPin, id: Hash,
  email: Tag, phone: Tag,
};

const ENTITY_COLORS: Record<string, string> = {
  person: 'bg-blue-500/20 text-blue-300 border-blue-500/20',
  date: 'bg-green-500/20 text-green-300 border-green-500/20',
  amount: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/20',
  organization: 'bg-purple-500/20 text-purple-300 border-purple-500/20',
  location: 'bg-orange-500/20 text-orange-300 border-orange-500/20',
  id: 'bg-slate-500/20 text-slate-300 border-slate-500/20',
  email: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/20',
  phone: 'bg-pink-500/20 text-pink-300 border-pink-500/20',
};

function formatBytes(bytes: number) {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [doc, setDoc] = useState<DocDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reprocessing, setReprocessing] = useState(false);

  async function fetchDoc() {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/documents/${params.id}`);
      const data = await res.json();
      if (data.success) setDoc(data.data.document);
      else setError(data.error ?? 'Failed to load document');
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  }

  async function reprocess() {
    setReprocessing(true);
    try {
      const res = await fetch('/api/documents/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: params.id }),
      });
      const data = await res.json();
      if (data.success) {
        setTimeout(() => { void fetchDoc(); }, 3000);
      }
    } finally { setReprocessing(false); }
  }

  useEffect(() => { void fetchDoc(); }, [params.id]);

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 size={32} className="animate-spin text-indigo-400" />
    </div>
  );

  if (error || !doc) return (
    <div className="flex items-center justify-center py-16">
      <div className="text-center">
        <AlertCircle size={40} className="mx-auto text-red-400 mb-3" />
        <p className="text-red-400 mb-4">{error || 'Document not found'}</p>
        <button onClick={() => router.back()} className="text-slate-400 hover:text-white text-sm">← Go back</button>
      </div>
    </div>
  );

  const groupedEntities = (doc.entities ?? []).reduce((acc, e) => {
    const key = e.type ?? 'other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {} as Record<string, Entity[]>);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back + actions */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex gap-2">
          {doc.status === 'failed' && (
            <button onClick={reprocess} disabled={reprocessing}
              className="flex items-center gap-2 text-xs bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 hover:bg-yellow-500/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
              {reprocessing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              Reprocess
            </button>
          )}
          {doc.status === 'ready' && (
            <Link href={`/dashboard/chat/${doc._id}`}
              className="flex items-center gap-2 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors">
              <MessageSquare size={12} /> Chat
            </Link>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-indigo-600/20 rounded-xl flex items-center justify-center shrink-0">
            <FileText size={24} className="text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white truncate">{doc.name}</h1>
            <p className="text-slate-400 text-sm mt-0.5">{doc.originalName}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', {
                'bg-green-500/20 text-green-300 border-green-500/20': doc.status === 'ready',
                'bg-red-500/20 text-red-300 border-red-500/20': doc.status === 'failed',
                'bg-yellow-500/20 text-yellow-300 border-yellow-500/20': ['processing','pending'].includes(doc.status),
              })}>{doc.status}</span>
              {doc.documentType && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 capitalize">{doc.documentType}</span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-slate-800 text-xs">
          {[
            ['File Size', formatBytes(doc.sizeBytes)],
            ['Pages', doc.pageCount ? String(doc.pageCount) : '—'],
            ['Language', doc.language ?? '—'],
            ['Uploaded', new Date(doc.createdAt).toLocaleDateString()],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-slate-500">{label}</p>
              <p className="text-slate-200 font-medium mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {doc.status === 'failed' && doc.errorMessage && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 font-medium text-sm">Processing Failed</p>
            <p className="text-red-400 text-xs mt-1">{doc.errorMessage}</p>
          </div>
        </div>
      )}

      {doc.summary && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Summary</h2>
          <p className="text-slate-200 text-sm leading-relaxed">{doc.summary}</p>
        </div>
      )}

      {Object.keys(groupedEntities).length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Extracted Entities</h2>
          <div className="space-y-4">
            {Object.entries(groupedEntities).map(([type, entities]) => {
              const Icon = ENTITY_ICONS[type] ?? Tag;
              const colorClass = ENTITY_COLORS[type] ?? 'bg-slate-500/20 text-slate-300 border-slate-500/20';
              return (
                <div key={type}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={13} className="text-slate-500" />
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{type}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {entities.map((e, i) => (
                      <span key={i} className={cn('text-xs px-2.5 py-1 rounded-full border font-medium', colorClass)}>
                        {e.value}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(doc.keywords ?? []).length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Keywords</h2>
          <div className="flex flex-wrap gap-2">
            {doc.keywords!.map((kw, i) => (
              <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">{kw}</span>
            ))}
          </div>
        </div>
      )}

      {(doc.anomalies ?? []).length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-yellow-400" />
            <h2 className="text-sm font-semibold text-yellow-400 uppercase tracking-wider">Anomalies Detected</h2>
          </div>
          <ul className="space-y-1">
            {doc.anomalies!.map((a, i) => (
              <li key={i} className="text-yellow-300 text-sm flex items-start gap-2">
                <span className="shrink-0 mt-0.5">•</span>{a}
              </li>
            ))}
          </ul>
        </div>
      )}

      {doc.aiProvider && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Cpu size={15} className="text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Processing Info</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
            {[
              ['AI Provider', doc.aiProvider],
              ['Model', doc.aiModel ?? '—'],
              ['Tokens Used', doc.tokensUsed?.toLocaleString() ?? '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-slate-500">{label}</p>
                <p className="text-slate-200 font-medium mt-0.5 font-mono">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
