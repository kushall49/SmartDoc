import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { IntelligenceReport } from '../types';
import {
  Cpu,
  Sparkles,
  AlertTriangle,
  Layers,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldAlert,
  Lightbulb,
} from 'lucide-react';

export const IntelligencePage: React.FC = () => {
  const [query, setQuery] = useState(
    'Scan all documents for conflicting liability clauses, mismatched payment terms, and critical non-compete restrictions.'
  );

  const scanMutation = useMutation<{ success: boolean; report: IntelligenceReport }>({
    mutationFn: () => api.post('/intelligence', { query }),
  });

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      scanMutation.mutate();
    }
  };

  const report = scanMutation.data?.report;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Cross-Document Intelligence</h1>
        <p className="text-xs text-slate-400 mt-1">
          Perform holistic cross-repository audits to discover hidden contradictions, recurring patterns, and compliance risks.
        </p>
      </div>

      {/* Query Form */}
      <form onSubmit={handleScan} className="p-6 rounded-2xl bg-[#10131a] border border-[#232733] space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Intelligence Audit Prompt
          </label>
          <textarea
            rows={3}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Specify what patterns, contradictions, or compliance standards you wish to analyze across all documents..."
            className="w-full p-3 rounded-xl bg-[#161922] border border-[#262b3a] focus:border-indigo-500 focus:outline-none text-xs text-slate-100 placeholder:text-slate-500 leading-relaxed"
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-slate-500">
            Powered by GPT-4o multi-document synthesis &bull; Full tenant document scope
          </span>

          <button
            type="submit"
            disabled={!query.trim() || scanMutation.isPending}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-semibold text-white flex items-center space-x-2 transition-all shadow-glow"
          >
            {scanMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Running Audit...</span>
              </>
            ) : (
              <>
                <Cpu className="w-4 h-4" />
                <span>Execute Intelligence Scan</span>
              </>
            )}
          </button>
        </div>
      </form>

      {scanMutation.isError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
          {(scanMutation.error as any)?.message || 'Cross-document intelligence scan failed.'}
        </div>
      )}

      {/* Report View */}
      {report && (
        <div className="space-y-6">
          {/* Executive Summary */}
          <div className="p-6 rounded-2xl bg-[#10131a] border border-[#232733] space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Executive Synthesis</span>
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                {report.documentCount || 'Multi'} Documents Analyzed
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
              {report.summary}
            </p>
          </div>

          {/* Contradictions Detected */}
          {report.contradictions && report.contradictions.length > 0 && (
            <div className="p-6 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Detected Cross-Document Contradictions ({report.contradictions.length})</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {report.contradictions.map((contra, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-[#12151e] border border-[#232733] space-y-2">
                    <div className="text-xs font-bold text-rose-300">{contra.issue}</div>
                    <p className="text-xs text-slate-400 leading-relaxed">{contra.explanation}</p>
                    {contra.conflictingDocuments && contra.conflictingDocuments.length > 0 && (
                      <div className="text-[10px] text-slate-500 pt-1 font-mono">
                        Conflicting: {contra.conflictingDocuments.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Identified Recurring Patterns */}
          {report.patterns && report.patterns.length > 0 && (
            <div className="p-6 rounded-2xl bg-[#10131a] border border-[#232733] space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>Recurring Repository Patterns ({report.patterns.length})</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {report.patterns.map((pat, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-[#161922] border border-[#232733] space-y-2">
                    <div className="text-xs font-bold text-cyan-300">{pat.theme}</div>
                    <p className="text-xs text-slate-400 leading-relaxed">{pat.description}</p>
                    {pat.documentsInvolved && (
                      <div className="text-[10px] text-slate-500 pt-1 font-mono">
                        Occurrences: {pat.documentsInvolved.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Compliance & Strategic Recommendations */}
          {report.recommendations && report.recommendations.length > 0 && (
            <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Strategic Recommendations ({report.recommendations.length})</span>
              </h2>

              <ul className="space-y-2">
                {report.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-xs text-emerald-200/90 flex items-start space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

