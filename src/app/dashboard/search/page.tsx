'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, FileText, MessageSquare, Loader2, BookOpen } from 'lucide-react';

interface SearchResult {
  documentId: string;
  document?: { name: string; documentType?: string };
  chunk: string;
  page?: number;
  score: number;
}

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) return;
    setLoading(true); setError(''); setSearched(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=10`);
      const data = await res.json();
      if (data.success) setResults(data.data.results);
      else { setError(data.error ?? 'Search failed'); setResults([]); }
    } catch { setError('Search failed. Please try again.'); setResults([]); }
    finally { setLoading(false); }
  }, []);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Semantic Search</h1>
        <p className="text-slate-400 text-sm mt-1">Search across all your documents using natural language</p>
      </div>

      <div className="flex gap-3 mb-8">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void doSearch(query); }}
            placeholder="e.g. invoice total amount, contract termination clause"
            className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl pl-11 pr-4 py-3 text-sm placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <button onClick={() => void doSearch(query)} disabled={loading || query.trim().length < 2}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-5 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          Search
        </button>
      </div>

      {error && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-4">{error}</div>}

      {loading && (
        <div className="text-center py-12">
          <Loader2 size={32} className="animate-spin text-indigo-400 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Searching…</p>
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="text-center py-12">
          <BookOpen size={40} className="mx-auto text-slate-700 mb-3" />
          <p className="text-slate-300 font-medium">No results found</p>
          <p className="text-slate-500 text-sm mt-1">Try different keywords or upload more documents</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-3">
          <p className="text-slate-400 text-sm">{results.length} result{results.length !== 1 ? 's' : ''}</p>
          {results.map((r, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText size={15} className="text-indigo-400 shrink-0" />
                  <span className="text-white font-medium text-sm">{r.document?.name ?? 'Document'}</span>
                  {r.document?.documentType && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 capitalize">{r.document.documentType}</span>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  r.score >= 0.7 ? 'bg-green-500/20 text-green-300' :
                  r.score >= 0.5 ? 'bg-yellow-500/20 text-yellow-300' : 'bg-slate-700 text-slate-400'}`}>
                  {Math.round(r.score * 100)}% match
                </span>
              </div>
              <p className="text-slate-400 text-sm line-clamp-3">{r.chunk}</p>
              <div className="flex gap-2 mt-3">
                <button onClick={() => router.push(`/dashboard/chat/${r.documentId}`)}
                  className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg">
                  <MessageSquare size={12} /> Chat about this
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
