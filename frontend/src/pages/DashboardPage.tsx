import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { DocumentItem, UsageAnalytics } from '../types';
import {
  Files,
  UploadCloud,
  MessageSquare,
  Search,
  GitCompare,
  Cpu,
  BarChart3,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  const { data: docData, isLoading: docsLoading } = useQuery<{ success: boolean; documents: DocumentItem[] }>({
    queryKey: ['documents'],
    queryFn: () => api.get('/documents'),
  });

  const { data: analyticsData } = useQuery<{ success: boolean; analytics: UsageAnalytics }>({
    queryKey: ['analytics'],
    queryFn: () => api.get('/audit/analytics'),
  });

  const documents = docData?.documents || [];
  const readyDocs = documents.filter((d) => d.status === 'ready');
  const analytics = analyticsData?.analytics;

  return (
    <div className="space-y-8">
      {/* Welcome Hero Card */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-indigo-950/40 via-[#121622] to-[#0d0f14] border border-indigo-500/20 shadow-glass flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1 flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
            <span>Intelligence Control Center</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Welcome back, {user?.name}
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-xl">
            Single-path document intelligence powered by pgvector HNSW indexing and direct OpenAI streaming.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/upload"
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center space-x-2 transition-all shadow-glow"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Document</span>
          </Link>
          <Link
            to="/chat"
            className="px-4 py-2.5 rounded-xl bg-[#1c2130] hover:bg-[#252c40] border border-[#2b334a] text-xs font-medium text-slate-200 transition-colors flex items-center space-x-2"
          >
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            <span>RAG Chat</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#10131a] border border-[#232733] space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Total Documents</span>
            <Files className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">{documents.length}</div>
          <div className="text-[11px] text-slate-500">{readyDocs.length} ready for vector queries</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#10131a] border border-[#232733] space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Vector Index Chunks</span>
            <Search className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {readyDocs.reduce((acc, d) => acc + (d.pageCount || 1) * 3, 0)}
          </div>
          <div className="text-[11px] text-slate-500">1536-d HNSW indexed</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#10131a] border border-[#232733] space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Tokens Ingested</span>
            <Cpu className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {(analytics?.totalTokens || documents.reduce((acc, d) => acc + (d.tokensUsed || 0), 0)).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500">OpenAI token usage logged</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#10131a] border border-[#232733] space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Total AI Cost</span>
            <BarChart3 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            ${(analytics?.totalCostUsd || 0).toFixed(4)}
          </div>
          <div className="text-[11px] text-slate-500">Exact calculation per model</div>
        </div>
      </div>

      {/* Quick Launch Tools Grid */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Intelligence Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/chat"
            className="p-5 rounded-2xl bg-[#10131a] border border-[#232733] hover:border-indigo-500/40 transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3 group-hover:scale-105 transition-transform">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-200">RAG Streaming Chat</h3>
              <p className="text-xs text-slate-400 mt-1">
                Converse with single or cross-document repositories with real-time SSE token streaming and verified citations.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-semibold text-indigo-400 group-hover:translate-x-1 transition-transform">
              <span>Start session</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>

          <Link
            to="/compare"
            className="p-5 rounded-2xl bg-[#10131a] border border-[#232733] hover:border-cyan-500/40 transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-3 group-hover:scale-105 transition-transform">
                <GitCompare className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-200">Document Comparison</h3>
              <p className="text-xs text-slate-400 mt-1">
                Perform automated semantic diffs between contracts, agreements, or drafts with risk assessments.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-semibold text-cyan-400 group-hover:translate-x-1 transition-transform">
              <span>Compare versions</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>

          <Link
            to="/intelligence"
            className="p-5 rounded-2xl bg-[#10131a] border border-[#232733] hover:border-emerald-500/40 transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-105 transition-transform">
                <Cpu className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-200">Cross-Doc Intelligence</h3>
              <p className="text-xs text-slate-400 mt-1">
                Scan your repository for contradictory terms, compliance anomalies, and overarching patterns.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform">
              <span>Scan repository</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Documents Table */}
      <div className="p-6 rounded-2xl bg-[#10131a] border border-[#232733] space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Recent Documents</h2>
          <Link to="/documents" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
            View all ({documents.length}) &rarr;
          </Link>
        </div>

        {docsLoading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            <p className="text-xs">Loading documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="py-12 text-center text-slate-500 space-y-3">
            <Files className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-xs">No documents uploaded yet.</p>
            <Link
              to="/upload"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 text-xs font-semibold"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload your first document</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#232733] text-slate-400 font-semibold">
                  <th className="pb-3 px-2">Document Name</th>
                  <th className="pb-3 px-2">Type</th>
                  <th className="pb-3 px-2">Status</th>
                  <th className="pb-3 px-2">Pages</th>
                  <th className="pb-3 px-2">Tokens</th>
                  <th className="pb-3 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2330]">
                {documents.slice(0, 5).map((doc) => (
                  <tr key={doc.id} className="hover:bg-[#151922] transition-colors">
                    <td className="py-3 px-2 font-medium text-slate-200">
                      <Link to={`/documents/${doc.id}`} className="hover:text-indigo-400">
                        {doc.name}
                      </Link>
                      <div className="text-[10px] text-slate-500">{doc.originalName}</div>
                    </td>
                    <td className="py-3 px-2">
                      <span className="px-2 py-0.5 rounded bg-[#1c2130] text-slate-300 font-mono text-[10px]">
                        {doc.documentType || 'document'}
                      </span>
                    </td>
                    <td className="py-3 px-2">
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
                    <td className="py-3 px-2 text-slate-400">{doc.pageCount || 1}</td>
                    <td className="py-3 px-2 text-slate-400 font-mono">{(doc.tokensUsed || 0).toLocaleString()}</td>
                    <td className="py-3 px-2 text-right">
                      <Link
                        to={`/documents/${doc.id}`}
                        className="px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 font-semibold text-[11px] transition-colors"
                      >
                        Inspect
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

