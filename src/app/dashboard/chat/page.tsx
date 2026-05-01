'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, FileText, Loader2, Plus } from 'lucide-react';

interface Doc {
  _id: string;
  name: string;
  documentType?: string;
  summary?: string;
  status: string;
  createdAt: string;
}

export default function ChatPickerPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/documents?status=ready&limit=50')
      .then((r) => r.json())
      .then((d) => { if (d.success) setDocs(d.data.documents); })
      .catch(() => void 0)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">AI Chat</h1>
        <p className="text-slate-400 text-sm mt-1">Choose a document to start chatting, or use cross-document mode</p>
      </div>

      <Link href="/dashboard/chat/cross"
        className="flex items-center gap-4 bg-indigo-600/20 border border-indigo-500/30 hover:border-indigo-500/60 rounded-2xl p-5 mb-6 group transition-colors">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
          <MessageSquare size={20} className="text-white" />
        </div>
        <div>
          <p className="text-white font-semibold">Chat Across All Documents</p>
          <p className="text-slate-400 text-sm">Ask questions that span your entire document library</p>
        </div>
      </Link>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={28} className="animate-spin text-indigo-400" />
        </div>
      ) : docs.length === 0 ? (
        <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl">
          <FileText size={40} className="mx-auto text-slate-700 mb-3" />
          <p className="text-slate-300 font-medium mb-1">No ready documents</p>
          <p className="text-slate-500 text-sm mb-4">Upload and process a document first</p>
          <Link href="/dashboard/upload"
            className="inline-flex items-center gap-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg">
            <Plus size={14} /> Upload Document
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Your Documents</p>
          {docs.map((doc) => (
            <Link key={doc._id} href={`/dashboard/chat/${doc._id}`}
              className="flex items-center justify-between bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl px-4 py-3.5 transition-colors group">
              <div className="flex items-center gap-3 min-w-0">
                <FileText size={16} className="text-indigo-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">{doc.name}</p>
                  {doc.summary && <p className="text-slate-500 text-xs truncate mt-0.5 max-w-xs">{doc.summary.slice(0, 80)}</p>}
                </div>
              </div>
              <MessageSquare size={15} className="text-slate-600 group-hover:text-indigo-400 transition-colors shrink-0 ml-3" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
