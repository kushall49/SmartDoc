'use client';

import { useState } from 'react';
import { Brain, Loader2, AlertCircle, Lightbulb, Network, Clock } from 'lucide-react';

type Mode = 'full-analysis' | 'cluster' | 'entity-timeline';

interface Insight { title: string; description: string; relatedDocuments?: string[] }
interface Cluster { name: string; documentIds: string[]; commonThemes: string[] }
interface EntityTimeline { entity: string; appearances: Array<{ documentId: string; context: string; date?: string }> }

interface IntelligenceResult {
  insights?: Insight[];
  clusters?: Cluster[];
  relatedDocumentClusters?: Cluster[]; // Adding this
  entityTimelines?: EntityTimeline[];
  summary?: string;
}

export default function IntelligencePage() {
  const [mode, setMode] = useState<Mode>('full-analysis');
  const [query, setQuery] = useState('');
  const [entityValue, setEntityValue] = useState('');
  const [result, setResult] = useState<IntelligenceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function analyze() {
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, query: query || undefined, entityValue: entityValue || undefined }),
      });
      const data = await res.json();
      if (data.success) setResult(data.result);
      else setError(data.error ?? 'Analysis failed');
    } catch { setError('Request failed. Please try again.'); }
    finally { setLoading(false); }
  }

  const modes: Array<{ key: Mode; label: string; icon: React.ElementType; desc: string }> = [
    { key: 'full-analysis', label: 'Full Analysis', icon: Brain, desc: 'Cross-document insights and patterns' },
    { key: 'cluster', label: 'Topic Clusters', icon: Network, desc: 'Group documents by topic similarity' },
    { key: 'entity-timeline', label: 'Entity Timeline', icon: Clock, desc: 'Track an entity across documents' },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Cross-Document Intelligence</h1>
        <p className="text-slate-400 text-sm mt-1">Groq AI analysis spanning your entire document library</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
        <div className="grid grid-cols-3 gap-2 mb-5">
          {modes.map((m) => (
            <button key={m.key} onClick={() => setMode(m.key)} suppressHydrationWarning
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-xs transition-colors ${mode === m.key ? 'bg-indigo-600/20 border-indigo-500/40 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-600'}`}>
              <m.icon size={18} className={mode === m.key ? 'text-indigo-400' : 'text-slate-500'} />
              <span className="font-medium">{m.label}</span>
            </button>
          ))}
        </div>

        {mode === 'full-analysis' && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Analysis Query (optional)</label>
            <input value={query} onChange={(e) => setQuery(e.target.value)} suppressHydrationWarning
              placeholder="e.g. What are the key financial trends across my documents?"
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2.5 text-sm placeholder:text-slate-500 focus:outline-none focus:border-indigo-500" />
          </div>
        )}

        {mode === 'entity-timeline' && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Entity to Track</label>
            <input value={entityValue} onChange={(e) => setEntityValue(e.target.value)} suppressHydrationWarning
              placeholder="e.g. Acme Corp, John Smith, $50,000"
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2.5 text-sm placeholder:text-slate-500 focus:outline-none focus:border-indigo-500" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3 mb-4">
            <AlertCircle size={15} />{error}
          </div>
        )}

        <button onClick={analyze} disabled={loading || (mode === 'entity-timeline' && !entityValue.trim())} suppressHydrationWarning
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
          {loading ? <><Loader2 size={16} className="animate-spin" />Analyzing…</> : <><Brain size={16} />Run Analysis</>}
        </button>
      </div>

      {result && (
        <div className="space-y-4">
          {result.summary && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <p className="text-slate-300 text-sm leading-relaxed">{result.summary}</p>
            </div>
          )}

          {(result.insights ?? []).length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Insights</h2>
              <div className="space-y-4">
                {result.insights!.map((ins, i) => (
                  <div key={i} className="flex gap-3">
                    <Lightbulb size={16} className="text-yellow-400 shrink-0 mt-1" />
                    <div>
                      <p className="text-white font-medium text-sm">{ins.title}</p>
                      <p className="text-slate-400 text-xs mt-1 leading-relaxed">{ins.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(result.clusters || result.relatedDocumentClusters || []).length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Topic Clusters</h2>
              <div className="space-y-3">
                {(result.clusters || result.relatedDocumentClusters || []).map((cl, i) => (
                  <div key={i} className="bg-slate-800 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white font-medium text-sm">{cl.name || cl.theme}</p>
                      <span className="text-xs text-slate-500">{(cl.documentIds || cl.documents || []).length} docs</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(cl.commonThemes || [cl.theme]).filter(Boolean).map((t, j) => (
                        <span key={j} className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">{t}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {(result.entityTimelines || []).length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Entity Tracking</h2>
              <div className="space-y-4">
                {result.entityTimelines!.map((et, i) => (
                  <div key={i} className="border border-slate-700/50 rounded-xl p-4">
                    <p className="text-indigo-400 font-bold mb-3">{et.entity}</p>
                    <div className="space-y-3 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent">
                      {(et.appearances || []).map((app, j) => (
                         <div key={j} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                           <div className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-slate-900 bg-indigo-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2" />
                           <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] bg-slate-800 p-3 rounded shadow">
                              <p className="text-xs text-slate-400 mb-1">{app.date ? new Date(app.date).toLocaleDateString() : 'Unknown Date'} - {(app as any).documentName || 'Document'}</p>
                              <p className="text-sm text-slate-300">{app.context}</p>
                           </div>
                         </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
