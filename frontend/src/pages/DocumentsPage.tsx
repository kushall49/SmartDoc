import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { DocumentItem } from '../types';
import {
  Files,
  UploadCloud,
  Search,
  Trash2,
  Share2,
  Download,
  MessageSquare,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  Copy,
  ExternalLink,
} from 'lucide-react';

export const DocumentsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [shareModalDoc, setShareModalDoc] = useState<DocumentItem | null>(null);
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery<{ success: boolean; documents: DocumentItem[] }>({
    queryKey: ['documents'],
    queryFn: () => api.get('/documents'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  const documents = data?.documents || [];

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.keywords && doc.keywords.some((k) => k.toLowerCase().includes(searchTerm.toLowerCase())));

    const matchesType = filterType === 'all' || doc.documentType === filterType;
    return matchesSearch && matchesType;
  });

  const uniqueTypes = Array.from(new Set(documents.map((d) => d.documentType).filter(Boolean)));

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to permanently delete "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleCopyShareLink = (docId: string) => {
    const shareUrl = `${window.location.origin}/share/${docId}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Documents Repository</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage, inspect, vectorize, and export ingested enterprise files.
          </p>
        </div>
        <Link
          to="/upload"
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center space-x-2 transition-all shadow-glow shrink-0 w-fit"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Document</span>
        </Link>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 rounded-2xl bg-[#10131a] border border-[#232733] flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name or keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#161922] border border-[#262b3a] focus:border-indigo-500 focus:outline-none text-xs text-slate-100 placeholder:text-slate-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterType === 'all'
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                : 'text-slate-400 hover:bg-[#161922]'
            }`}
          >
            All ({documents.length})
          </button>
          {uniqueTypes.map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t as string)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                filterType === t
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:bg-[#161922]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Table */}
      <div className="rounded-2xl bg-[#10131a] border border-[#232733] overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-xs">Loading documents repository...</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="py-16 text-center text-slate-500 space-y-3">
            <Files className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-sm text-slate-400 font-medium">No documents found matching your filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#232733] text-slate-400 font-semibold bg-[#12151f]">
                  <th className="py-3.5 px-4">Document</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Size & Pages</th>
                  <th className="py-3.5 px-4">Anomalies</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2330]">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-[#151922] transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-200">
                      <Link
                        to={`/documents/${doc.id}`}
                        className="hover:text-indigo-400 text-sm font-semibold flex items-center space-x-2"
                      >
                        <span>{doc.name}</span>
                      </Link>
                      <div className="text-[11px] text-slate-500 mt-0.5">{doc.originalName}</div>
                      {doc.summary && (
                        <div className="text-[11px] text-slate-400 line-clamp-1 mt-1 max-w-md">
                          {doc.summary}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-[#1c2130] text-slate-300 font-mono text-[10px] uppercase">
                        {doc.documentType || 'document'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {doc.status === 'ready' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Ready
                        </span>
                      )}
                      {doc.status === 'processing' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Processing
                        </span>
                      )}
                      {doc.status === 'pending' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          Queued
                        </span>
                      )}
                      {doc.status === 'failed' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      <div>{(doc.sizeBytes / 1024).toFixed(1)} KB</div>
                      <div className="text-[10px] text-slate-500">{doc.pageCount || 1} pages</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {doc.anomalies && doc.anomalies.length > 0 ? (
                        <span className="inline-flex items-center space-x-1 text-amber-400 text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>{doc.anomalies.length} flagged</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Clean</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <Link
                          to={`/documents/${doc.id}`}
                          title="Inspect document"
                          className="p-1.5 rounded-lg bg-[#1a1e2b] text-slate-300 hover:text-indigo-400 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>

                        <Link
                          to={`/chat?docId=${doc.id}`}
                          title="Chat with document"
                          className="p-1.5 rounded-lg bg-[#1a1e2b] text-slate-300 hover:text-indigo-400 transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </Link>

                        <button
                          onClick={() => setShareModalDoc(doc)}
                          title="Share document link"
                          className="p-1.5 rounded-lg bg-[#1a1e2b] text-slate-300 hover:text-cyan-400 transition-colors"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>

                        <a
                          href={`/api/documents/${doc.id}/export?format=json`}
                          download
                          title="Export JSON"
                          className="p-1.5 rounded-lg bg-[#1a1e2b] text-slate-300 hover:text-emerald-400 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>

                        <button
                          onClick={() => handleDelete(doc.id, doc.name)}
                          title="Delete document"
                          className="p-1.5 rounded-lg bg-[#1a1e2b] text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Share Modal Dialog */}
      {shareModalDoc && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#10131a] border border-[#232733] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Share2 className="w-4 h-4 text-cyan-400" />
                <span>Share Document</span>
              </h3>
              <button
                onClick={() => setShareModalDoc(null)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Anyone with this link can view the extracted summary, entities, and keywords without an account:
            </p>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/share/${shareModalDoc.id}`}
                className="w-full px-3 py-2 rounded-xl bg-[#161922] border border-[#262b3a] text-xs font-mono text-slate-300 focus:outline-none"
              />
              <button
                onClick={() => handleCopyShareLink(shareModalDoc.id)}
                className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white flex items-center space-x-1.5 shrink-0 transition-colors"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShareModalDoc(null)}
                className="px-4 py-2 rounded-xl bg-[#1c2130] hover:bg-[#252c40] text-xs font-medium text-slate-300"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

