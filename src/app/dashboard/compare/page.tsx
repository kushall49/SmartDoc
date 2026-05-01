'use client';

import { useEffect, useState } from 'react';
import { GitCompare, Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Doc { _id: string; name: string; documentType?: string }
interface CompareResult {
  similarity?: number;
  summary?: string;
  keyDifferences?: string[];
  addedContent?: string[];
  removedContent?: string[];
  semanticChanges?: Array<{ section: string; change: string; risk: string }>;
  recommendation?: string;
}

export default function ComparePage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [docA, setDocA] = useState('');
  const [docB, setDocB] = useState('');
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingDocs, setFetchingDocs] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/documents?status=ready&limit=50')
      .then((r) => r.json())
      .then((d) => { if (d.success) setDocs(d.data.documents); })
      .catch(() => void 0)
      .finally(() => setFetchingDocs(false));
  }, []);

  async function compare() {
    if (!docA || !docB || docA === docB) { setError('Please select two different documents'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/documents/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId1: docA, documentId2: docB }),
      });
      const data = await res.json();
      if (data.success) setResult(data.data.comparison as CompareResult);
      else setError(data.error ?? 'Comparison failed');
    } catch { setError('Request failed. Please try again.'); }
    finally { setLoading(false); }
  }

  const riskColors: Record<string, string> = {
    high: 'bg-red-500/20 text-red-300 border-red-500/20',
    medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/20',
    low: 'bg-green-500/20 text-green-300 border-green-500/20',
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Compare Documents</h1>
        <p className="text-slate-400 text-sm mt-1">Groq AI semantic comparison — finds meaning-level differences</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
        {fetchingDocs ? (
          <div className="flex items-center justify-center py-8"><Loader2 size={24} className="animate-spin text-indigo-400" /></div>
        ) : docs.length < 2 ? (
          <p className="text-slate-400 text-sm text-center py-4">You need at least 2 processed documents to compare.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {[
                { label: 'Document A', value: docA, setter: setDocA },
                { label: 'Document B', value: docB, setter: setDocB },
              ].map(({ label, value, setter }) => (
                <div key={label}>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
                  <div className="relative">
                    <select value={value} onChange={(e) => setter(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2.5 text-sm appearance-none focus:outline-none focus:border-indigo-500 pr-8">
                      <option value="">Select document…</option>
                      {docs.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3 mb-4">
                <AlertCircle size={15} /> {error}
              </div>
            )}

            <button onClick={compare} disabled={loading || !docA || !docB || docA === docB}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium py-2.5 rounded-lg transition-colors text-sm">
              {loading ? <><Loader2 size={16} className="animate-spin" />Comparing with Groq…</> : <><GitCompare size={16} />Compare Documents</>}
            </button>
          </>
        )}
      </div>

      {result && (
        <div className="space-y-4">
          {result.similarity !== undefined && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Overall Similarity</h2>
                <span className={cn('text-2xl font-bold', result.similarity >= 70 ? 'text-green-400' : result.similarity >= 40 ? 'text-yellow-400' : 'text-red-400')}>
                  {result.similarity}%
                </span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className={cn('h-full rounded-full transition-all', result.similarity >= 70 ? 'bg-green-500' : result.similarity >= 40 ? 'bg-yellow-500' : 'bg-red-500')}
                  style={{ width: `${result.similarity}%` }} />
              </div>
              {result.summary && <p className="text-slate-300 text-sm mt-3 leading-relaxed">{result.summary}</p>}
            </div>
          )}

          {(result.keyDifferences ?? []).length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Key Differences</h2>
              <ul className="space-y-2">
                {result.keyDifferences!.map((d, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="text-indigo-400 shrink-0 mt-0.5">•</span>{d}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(result.semanticChanges ?? []).length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Semantic Changes</h2>
              <div className="space-y-3">
                {result.semanticChanges!.map((c, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border shrink-0 mt-0.5 font-medium', riskColors[c.risk] ?? riskColors.low)}>{c.risk}</span>
                    <div>
                      <p className="text-white text-sm font-medium">{c.section}</p>
                      <p className="text-slate-400 text-xs mt-0.5">{c.change}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.recommendation && (
            <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider mb-2">Recommendation</h2>
              <p className="text-slate-200 text-sm">{result.recommendation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
