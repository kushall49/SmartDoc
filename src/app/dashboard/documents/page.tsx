'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Image,
  Plus,
  Search,
  Loader2,
  AlertCircle,
  Trash2,
  MessageSquare,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Doc {
  _id: string;
  name: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  status: string;
  documentType?: string;
  summary?: string;
  entities?: Array<{ type: string; value: string }>;
  keywords?: string[];
  createdAt: string;
  pageCount?: number;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ready: 'bg-green-500/20 text-green-300 border-green-500/20',
    processing: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/20',
    pending: 'bg-slate-500/20 text-slate-300 border-slate-500/20',
    failed: 'bg-red-500/20 text-red-300 border-red-500/20',
    uploading: 'bg-blue-500/20 text-blue-300 border-blue-500/20',
  };
  return (
    <span
      className={cn(
        'text-xs px-2 py-0.5 rounded-full border font-medium',
        map[status] ?? 'bg-slate-700 text-slate-300'
      )}
    >
      {status === 'ready'
        ? 'Ready'
        : status === 'processing' || status === 'pending'
        ? 'Processing'
        : status === 'failed'
        ? 'Failed'
        : status}
    </span>
  );
}

function TypeBadge({ type }: { type?: string }) {
  if (!type) return null;
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 font-medium capitalize">
      {type}
    </span>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function DocumentCard({ doc, onDelete }: { doc: Doc; onDelete: (id: string) => void }) {
  const isImage = doc.mimeType?.startsWith('image/');
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${doc.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/documents/${doc._id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) onDelete(doc._id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isImage ? (
            <Image size={18} className="text-blue-400 shrink-0" />
          ) : (
            <FileText size={18} className="text-indigo-400 shrink-0" />
          )}
          <span className="text-white font-medium text-sm truncate">{doc.name}</span>
        </div>
        <StatusBadge status={doc.status} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <TypeBadge type={doc.documentType} />
        <span className="text-xs text-slate-500">{formatBytes(doc.sizeBytes || 0)}</span>
        {doc.pageCount && (
          <span className="text-xs text-slate-500">{doc.pageCount} page{doc.pageCount !== 1 ? 's' : ''}</span>
        )}
        <span className="text-xs text-slate-500 ml-auto">
          {new Date(doc.createdAt).toLocaleDateString()}
        </span>
      </div>

      {doc.summary && (
        <p className="text-slate-400 text-xs line-clamp-2">{doc.summary}</p>
      )}

      {(doc.entities?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1">
          {doc.entities!.slice(0, 3).map((e, i) => (
            <span key={i} className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
              {e.value}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-auto pt-1 border-t border-slate-800">
        <Link
          href={`/dashboard/documents/${doc._id}`}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 py-1.5 rounded-lg transition-colors"
        >
          <Eye size={13} />
          View
        </Link>
        {doc.status === 'ready' && (
          <Link
            href={`/dashboard/chat/${doc._id}`}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white py-1.5 rounded-lg transition-colors"
          >
            <MessageSquare size={13} />
            Chat
          </Link>
        )}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center justify-center gap-1.5 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
        </button>
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const LIMIT = 12;

  async function fetchDocs() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
      });
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);

      const res = await fetch(`/api/documents?${params}`);
      const data = await res.json();
      if (data.success) {
        setDocs(data.data.documents);
        setTotal(data.data.total);
      } else {
        setError(data.error ?? 'Failed to load documents');
      }
    } catch {
      setError('Network error. Please refresh.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void fetchDocs(); }, [page, statusFilter]);
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); void fetchDocs(); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  function handleDelete(id: string) {
    setDocs((prev) => prev.filter((d) => d._id !== id));
    setTotal((t) => t - 1);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Documents</h1>
          <p className="text-slate-400 text-sm mt-1">{total} document{total !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/dashboard/upload"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Upload
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6" suppressHydrationWarning>
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            suppressHydrationWarning
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents…"
            className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg pl-9 pr-4 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <select
          suppressHydrationWarning
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-slate-900 border border-slate-700 text-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Status</option>
          <option value="ready">Ready</option>
          <option value="processing">Processing</option>
          <option value="failed">Failed</option>
        </select>
        <button
          suppressHydrationWarning
          onClick={() => fetchDocs()}
          className="p-2 bg-slate-900 border border-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 mb-4">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-slate-700 rounded w-3/4 mb-3" />
              <div className="h-3 bg-slate-800 rounded w-1/2 mb-2" />
              <div className="h-8 bg-slate-800 rounded mt-4" />
            </div>
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="text-center py-16">
          <FileText size={48} className="mx-auto text-slate-700 mb-4" />
          <h3 className="text-slate-300 font-medium mb-1">No documents yet</h3>
          <p className="text-slate-500 text-sm mb-4">
            {search ? 'No documents match your search' : 'Upload your first document to get started'}
          </p>
          {!search && (
            <Link
              href="/dashboard/upload"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-2 rounded-lg"
            >
              <Plus size={16} />
              Upload Document
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {docs.map((doc) => (
              <DocumentCard key={doc._id} doc={doc} onDelete={handleDelete} />
            ))}
          </div>

          {total > LIMIT && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded-lg text-sm"
              >
                Previous
              </button>
              <span className="text-slate-400 text-sm">
                Page {page} of {Math.ceil(total / LIMIT)}
              </span>
              <button
                disabled={page >= Math.ceil(total / LIMIT)}
                onClick={() => setPage((p) => p + 1)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded-lg text-sm"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
