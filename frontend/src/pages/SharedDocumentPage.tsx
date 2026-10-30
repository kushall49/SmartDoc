import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { DocumentItem } from '../types';
import {
  FileText,
  Sparkles,
  Key,
  Tag,
  AlertTriangle,
  ArrowRight,
  Shield,
  Loader2,
} from 'lucide-react';

export const SharedDocumentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery<{ success: boolean; document: DocumentItem }>({
    queryKey: ['shared-document', id],
    queryFn: () => api.get(`/documents/public/${id}`),
    enabled: !!id,
  });

  const document = data?.document;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#08090c] flex flex-col items-center justify-center space-y-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-xs">Loading shared document...</p>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-[#08090c] flex flex-col items-center justify-center space-y-4 text-slate-500 p-6 text-center">
        <FileText className="w-12 h-12 text-slate-600" />
        <h2 className="text-lg font-bold text-slate-200">Shared Document Not Found</h2>
        <p className="text-xs text-slate-400 max-w-sm">
          This document link may have expired or been made private by its owner.
        </p>
        <Link
          to="/"
          className="px-4 py-2 rounded-xl bg-indigo-600 text-xs font-semibold text-white"
        >
          Go to SmartDocIQ
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08090c] text-white selection:bg-indigo-500/30">
      {/* Top Navbar */}
      <header className="border-b border-[#232733] bg-[#101217]/80 backdrop-blur-md px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <FileText className="w-4 h-4" />
          </div>
          <span className="text-base font-bold tracking-tight">SmartDocIQ</span>
        </Link>

        <div className="flex items-center space-x-3">
          <Link
            to="/login"
            className="text-xs text-slate-300 hover:text-white px-3 py-1.5"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1.5 rounded-lg transition-all"
          >
            Create Account
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto p-6 md:p-8 space-y-6">
        {/* Banner */}
        <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Public Document View &bull; Read-Only Shared Intelligence</span>
          </div>
          <span className="text-[10px] text-cyan-400 uppercase font-mono font-semibold">Verified</span>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">{document.name}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {document.documentType || 'document'}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {document.originalName} &bull; {(document.sizeBytes / 1024).toFixed(1)} KB &bull; {document.pageCount || 1} pages
          </p>
        </div>

        {/* Summary Card */}
        <div className="p-6 rounded-2xl bg-[#10131a] border border-[#232733] space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Document Summary</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
            {document.summary || 'Summary not available.'}
          </p>
        </div>

        {/* Extracted Entities */}
        {document.entities && Object.keys(document.entities).length > 0 && (
          <div className="p-6 rounded-2xl bg-[#10131a] border border-[#232733] space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>Extracted Entities</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(document.entities).map(([k, v]) => (
                <div key={k} className="p-3 rounded-xl bg-[#161922] border border-[#232733] flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-400 capitalize">{k.replace(/_/g, ' ')}</span>
                  <span className="font-mono text-slate-200">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Keywords */}
        {document.keywords && document.keywords.length > 0 && (
          <div className="p-6 rounded-2xl bg-[#10131a] border border-[#232733] space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <Tag className="w-3.5 h-3.5 text-cyan-400" />
              <span>Keyword Tags</span>
            </h2>
            <div className="flex flex-wrap gap-2">
              {document.keywords.map((kw, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-[#181c26] border border-[#282f42] text-[11px] text-slate-300 font-medium"
                >
                  #{kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* CTA Card */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/50 to-[#121622] border border-indigo-500/20 text-center space-y-3">
          <h3 className="text-sm font-bold text-white">Want to converse with this document using AI?</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Create an account on SmartDocIQ to run real-time RAG streaming chat, vector search, and comparative analysis.
          </p>
          <div className="pt-2">
            <Link
              to="/register"
              className="inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all shadow-glow"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

