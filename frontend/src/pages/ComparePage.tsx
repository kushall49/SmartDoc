import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { DocumentItem, ComparisonResult } from '../types';
import {
  GitCompare,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Sparkles,
} from 'lucide-react';

export const ComparePage: React.FC = () => {
  const [doc1Id, setDoc1Id] = useState('');
  const [doc2Id, setDoc2Id] = useState('');

  const { data: docsData } = useQuery<{ success: boolean; documents: DocumentItem[] }>({
    queryKey: ['documents'],
    queryFn: () => api.get('/documents'),
  });

  const documents = docsData?.documents || [];

  const compareMutation = useMutation<{
    success: boolean;
    comparison: ComparisonResult;
    documents: Array<{ id: string; name: string }>;
  }>({
    mutationFn: () =>
      api.post('/documents/compare', {
        documentId1: doc1Id,
        documentId2: doc2Id,
      }),
  });

  const comparison = compareMutation.data?.comparison;

  const handleCompare = (e: React.FormEvent) => {
    e.preventDefault();
    if (doc1Id && doc2Id && doc1Id !== doc2Id) {
      compareMutation.mutate();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Document Comparison</h1>
        <p className="text-xs text-slate-400 mt-1">
          Perform automated structural diffs, variance detection, and risk analysis between any two documents.
        </p>
      </div>

      {/* Selectors Bar */}
      <form onSubmit={handleCompare} className="p-6 rounded-2xl bg-[#10131a] border border-[#232733] space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Base Document (Version A)</label>
            <select
              value={doc1Id}
              onChange={(e) => setDoc1Id(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#161922] border border-[#262b3a] text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="">Select first document...</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id} disabled={d.id === doc2Id}>
                  {d.name} ({d.documentType || 'doc'})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Target Document (Version B)</label>
            <select
              value={doc2Id}
              onChange={(e) => setDoc2Id(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#161922] border border-[#262b3a] text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="">Select second document...</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id} disabled={d.id === doc1Id}>
                  {d.name} ({d.documentType || 'doc'})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={!doc1Id || !doc2Id || doc1Id === doc2Id || compareMutation.isPending}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-semibold text-white flex items-center space-x-2 transition-all shadow-glow"
          >
            {compareMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Comparing Documents...</span>
              </>
            ) : (
              <>
                <GitCompare className="w-4 h-4" />
                <span>Execute Semantic Diff</span>
              </>
            )}
          </button>
        </div>
      </form>

      {compareMutation.isError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
          {(compareMutation.error as any)?.message || 'Comparison failed.'}
        </div>
      )}

      {/* Comparison Results */}
      {comparison && (
        <div className="space-y-6">
          {/* Executive Summary & Score */}
          <div className="p-6 rounded-2xl bg-[#10131a] border border-[#232733] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Comparative Summary</span>
              </div>
              <p className="text-xs md:text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                {comparison.summary}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#161922] border border-[#232733] text-center min-w-[140px]">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Similarity Score</div>
              <div className="text-3xl font-extrabold text-cyan-400 font-mono mt-1">
                {(comparison.similarityScore * 100).toFixed(0)}%
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Structural Alignment</div>
            </div>
          </div>

          {/* Risk Analysis Card */}
          {comparison.riskAnalysis && (
            <div
              className={`p-6 rounded-2xl border ${
                comparison.riskAnalysis.riskLevel === 'high'
                  ? 'bg-rose-500/5 border-rose-500/20'
                  : comparison.riskAnalysis.riskLevel === 'medium'
                  ? 'bg-amber-500/5 border-amber-500/20'
                  : 'bg-emerald-500/5 border-emerald-500/20'
              } space-y-3`}
            >
              <div className="flex items-center space-x-2">
                <ShieldAlert
                  className={`w-4 h-4 ${
                    comparison.riskAnalysis.riskLevel === 'high'
                      ? 'text-rose-400'
                      : comparison.riskAnalysis.riskLevel === 'medium'
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Risk Level: <span className="uppercase">{comparison.riskAnalysis.riskLevel}</span>
                </span>
              </div>

              <ul className="space-y-1.5">
                {comparison.riskAnalysis.details.map((detail, idx) => (
                  <li key={idx} className="text-xs text-slate-300 flex items-start space-x-2">
                    <span className="text-indigo-400 font-bold">&bull;</span>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Sectional Diffs */}
          {comparison.differences && comparison.differences.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-white tracking-tight">Section-by-Section Differences</h2>
              <div className="space-y-4">
                {comparison.differences.map((diff, idx) => (
                  <div key={idx} className="p-5 rounded-2xl bg-[#10131a] border border-[#232733] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200">{diff.section}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          diff.significance === 'high'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : diff.significance === 'medium'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-slate-500/10 text-slate-400'
                        }`}
                      >
                        {diff.significance} variance
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                      <div className="p-3 rounded-xl bg-[#0c0e14] border border-[#1e222e] text-slate-300">
                        <div className="text-[10px] font-semibold text-slate-500 uppercase mb-1">Doc A Excerpt</div>
                        <div className="whitespace-pre-wrap">{diff.doc1Content || '(None)'}</div>
                      </div>
                      <div className="p-3 rounded-xl bg-[#0c0e14] border border-[#1e222e] text-slate-300">
                        <div className="text-[10px] font-semibold text-slate-500 uppercase mb-1">Doc B Excerpt</div>
                        <div className="whitespace-pre-wrap">{diff.doc2Content || '(None)'}</div>
                      </div>
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
};

