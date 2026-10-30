import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { DocumentItem, VisionResult } from '../types';
import {
  FileText,
  MessageSquare,
  Share2,
  Download,
  AlertTriangle,
  Tag,
  Key,
  Copy,
  CheckCircle2,
  Eye,
  RefreshCw,
  Loader2,
  Sparkles,
  Layers,
  ArrowLeft,
} from 'lucide-react';

export const DocumentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'intelligence' | 'text' | 'vision'>('intelligence');
  const [copiedText, setCopiedText] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [visionAnalysisType, setVisionAnalysisType] = useState('full-analysis');

  const { data, isLoading, refetch } = useQuery<{ success: boolean; document: DocumentItem }>({
    queryKey: ['document', id],
    queryFn: () => api.get(`/documents/${id}`),
    enabled: !!id,
  });

  const visionMutation = useMutation({
    mutationFn: (type: string) => api.post(`/documents/${id}/vision`, { analysisType: type }),
  });

  const document = data?.document;

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-xs">Loading document intelligence...</p>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="py-24 text-center text-slate-500 space-y-4">
        <FileText className="w-12 h-12 mx-auto text-slate-600" />
        <h2 className="text-lg font-bold text-slate-300">Document Not Found</h2>
        <Link to="/documents" className="text-xs font-semibold text-indigo-400 hover:underline">
          &larr; Back to repository
        </Link>
      </div>
    );
  }

  const handleCopyText = () => {
    if (document.rawText) {
      navigator.clipboard.writeText(document.rawText);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  const handleShareLink = () => {
    const url = `${window.location.origin}/share/${document.id}`;
    navigator.clipboard.writeText(url);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const isImage = document.mimeType.startsWith('image/');

  return (
    <div className="space-y-6">
      {/* Back button and title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            to="/documents"
            className="inline-flex items-center space-x-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to repository</span>
          </Link>
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

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          <Link
            to={`/chat?docId=${document.id}`}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center space-x-1.5 transition-all shadow-glow"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>RAG Chat</span>
          </Link>

          <button
            onClick={handleShareLink}
            className="px-3.5 py-2 rounded-xl bg-[#161a24] hover:bg-[#202534] border border-[#282e40] text-xs font-medium text-slate-200 flex items-center space-x-1.5 transition-colors"
          >
            {copiedShare ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-cyan-400" />}
            <span>{copiedShare ? 'Link Copied' : 'Share'}</span>
          </button>

          <div className="relative group">
            <button className="px-3.5 py-2 rounded-xl bg-[#161a24] hover:bg-[#202534] border border-[#282e40] text-xs font-medium text-slate-200 flex items-center space-x-1.5 transition-colors">
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export</span>
            </button>
            <div className="absolute right-0 mt-1 w-32 bg-[#12151e] border border-[#232733] rounded-xl shadow-xl py-1 z-20 hidden group-hover:block">
              <a
                href={`/api/documents/${document.id}/export?format=json`}
                download
                className="block px-3 py-1.5 text-xs text-slate-300 hover:bg-[#1a1e2b] hover:text-white"
              >
                Export JSON
              </a>
              <a
                href={`/api/documents/${document.id}/export?format=csv`}
                download
                className="block px-3 py-1.5 text-xs text-slate-300 hover:bg-[#1a1e2b] hover:text-white"
              >
                Export CSV
              </a>
              <a
                href={`/api/documents/${document.id}/export?format=text`}
                download
                className="block px-3 py-1.5 text-xs text-slate-300 hover:bg-[#1a1e2b] hover:text-white"
              >
                Export Plain Text
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-[#232733] pb-2">
        <button
          onClick={() => setActiveTab('intelligence')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2 ${
            activeTab === 'intelligence'
              ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#141722]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Extracted Intelligence</span>
        </button>

        <button
          onClick={() => setActiveTab('text')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2 ${
            activeTab === 'text'
              ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#141722]'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Raw Extracted Text</span>
        </button>

        {isImage && (
          <button
            onClick={() => setActiveTab('vision')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2 ${
              activeTab === 'vision'
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#141722]'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span>GPT-4o Vision Analyzer</span>
          </button>
        )}
      </div>

      {/* Tab 1: Extracted Intelligence */}
      {activeTab === 'intelligence' && (
        <div className="space-y-6">
          {/* Executive Summary Card */}
          <div className="p-6 rounded-2xl bg-[#10131a] border border-[#232733] space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Executive Summary</span>
            </h2>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
              {document.summary || 'Summary generation in progress or text is awaiting processing.'}
            </p>
          </div>

          {/* Key-Value Extracted Entities */}
          <div className="p-6 rounded-2xl bg-[#10131a] border border-[#232733] space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>Extracted Key-Value Entities</span>
            </h2>

            {document.entities && Object.keys(document.entities).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(document.entities).map(([k, v]) => (
                  <div key={k} className="p-3 rounded-xl bg-[#161922] border border-[#232733] flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-400 capitalize">{k.replace(/_/g, ' ')}</span>
                    <span className="font-mono text-slate-200">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No structured entities extracted yet.</p>
            )}
          </div>

          {/* Anomalies & Compliance Flags */}
          {document.anomalies && document.anomalies.length > 0 && (
            <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Detected Anomalies & Risk Flags ({document.anomalies.length})</span>
              </h2>
              <ul className="space-y-2">
                {document.anomalies.map((anom, i) => (
                  <li key={i} className="text-xs text-amber-200/90 flex items-start space-x-2">
                    <span className="text-amber-400 font-bold">&bull;</span>
                    <span>{anom}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Keywords */}
          {document.keywords && document.keywords.length > 0 && (
            <div className="p-6 rounded-2xl bg-[#10131a] border border-[#232733] space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                <Tag className="w-3.5 h-3.5 text-cyan-400" />
                <span>Document Keyword Tags</span>
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
        </div>
      )}

      {/* Tab 2: Raw Extracted Text */}
      {activeTab === 'text' && (
        <div className="p-6 rounded-2xl bg-[#10131a] border border-[#232733] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Extracted Full Text Content
            </h2>
            <button
              onClick={handleCopyText}
              className="px-3 py-1.5 rounded-lg bg-[#161922] border border-[#262b3a] hover:bg-[#1e2330] text-xs font-medium text-slate-300 flex items-center space-x-1.5 transition-colors"
            >
              {copiedText ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedText ? 'Copied' : 'Copy Text'}</span>
            </button>
          </div>

          <div className="p-4 rounded-xl bg-[#0b0d12] border border-[#1e222e] max-h-[600px] overflow-y-auto">
            <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
              {document.rawText || 'No text content available.'}
            </pre>
          </div>
        </div>
      )}

      {/* Tab 3: Vision Analysis for Images */}
      {activeTab === 'vision' && isImage && (
        <div className="p-6 rounded-2xl bg-[#10131a] border border-[#232733] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <Eye className="w-4 h-4 text-cyan-400" />
                <span>GPT-4o Vision Inspection</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Analyze diagrams, handwritten text, charts, or tables using OpenAI Vision API.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <select
                value={visionAnalysisType}
                onChange={(e) => setVisionAnalysisType(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#161922] border border-[#262b3a] text-xs text-slate-200 focus:outline-none"
              >
                <option value="full-analysis">Full Comprehensive Analysis</option>
                <option value="ocr">Extract Text & OCR</option>
                <option value="diagram">Diagram & Chart Structure</option>
                <option value="table">Table Extraction</option>
              </select>

              <button
                onClick={() => visionMutation.mutate(visionAnalysisType)}
                disabled={visionMutation.isPending}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-xs font-semibold text-white flex items-center space-x-1.5 transition-all"
              >
                {visionMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Run Vision AI</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {visionMutation.isError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
              {(visionMutation.error as any)?.message || 'Vision analysis failed.'}
            </div>
          )}

          {visionMutation.data?.result && (
            <div className="p-4 rounded-xl bg-[#0b0d12] border border-[#1e222e] space-y-3">
              <h3 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Vision AI Results</h3>
              <div className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-mono">
                {typeof visionMutation.data.result === 'object'
                  ? JSON.stringify(visionMutation.data.result, null, 2)
                  : String(visionMutation.data.result)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

