import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  Search,
  MessageSquare,
  ShieldCheck,
  Zap,
  Cpu,
  Layers,
  ArrowRight,
  Database,
  CheckCircle2,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#08090c] text-white selection:bg-indigo-500/30">
      {/* Top Navigation */}
      <header className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[1px] shadow-glow flex items-center justify-center">
            <div className="w-full h-full bg-[#0d0f14] rounded-[11px] flex items-center justify-center">
              <FileText className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <span className="text-xl font-bold tracking-tight">SmartDoc<span className="text-indigo-400">IQ</span></span>
        </div>

        <div className="flex items-center space-x-4">
          {user ? (
            <Link
              to="/dashboard"
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center space-x-1.5 transition-all shadow-glow"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-xs font-medium text-slate-300 hover:text-white px-3 py-2">
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center space-x-1.5 transition-all shadow-glow"
              >
                <span>Get Started</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-8">
          <Zap className="w-3.5 h-3.5" />
          <span>Production Single-Path Architecture</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight md:leading-tight mb-6">
          AI Document Intelligence <br />
          <span className="bg-gradient-to-r from-indigo-400 via-cyan-300 to-indigo-200 bg-clip-text text-transparent">
            Engineered Without Compromise
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-base md:text-lg text-slate-400 mb-10 leading-relaxed">
          Extract, index, vectorize, and converse with mission-critical documents in real-time.
          Powered by native PostgreSQL pgvector, direct OpenAI models, and Express SSE streaming.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to={user ? "/dashboard" : "/register"}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white transition-all shadow-glow flex items-center justify-center space-x-2"
          >
            <span>Launch Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#features"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#141722] hover:bg-[#1a1f2e] border border-[#232733] text-sm font-medium text-slate-300 transition-colors"
          >
            Explore Architecture
          </a>
        </div>
      </section>

      {/* Architecture Badges */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { title: 'PostgreSQL + pgvector', desc: '1536-d HNSW Cosine Index', icon: Database },
            { title: 'OpenAI Direct Integration', desc: 'GPT-4o & text-embedding-3', icon: Cpu },
            { title: 'BullMQ Job Queue', desc: 'Background pipeline processing', icon: Layers },
            { title: 'Native Express SSE', desc: 'Sub-millisecond token streaming', icon: Zap },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-4 rounded-xl bg-[#10131a] border border-[#232733] flex flex-col justify-between space-y-3"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">{item.title}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{item.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-3">
            Core Intelligence Capabilities
          </h2>
          <p className="text-xs md:text-sm text-slate-400 max-w-xl mx-auto">
            A comprehensive suite of 14 document analysis tools accessible from a unified dashboard.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: MessageSquare,
              title: 'RAG Streaming Chat',
              desc: 'Ask questions with verified citations from source chunks and live token generation.',
            },
            {
              icon: Search,
              title: 'Vector Semantic Search',
              desc: 'Cosine distance similarity search over 1536-d vectors with document type & date filters.',
            },
            {
              icon: Layers,
              title: 'Document Comparison',
              desc: 'Side-by-side structural diff and risk evaluation between any two document versions.',
            },
            {
              icon: Cpu,
              title: 'Entity & Key-Value Extraction',
              desc: 'Automated metadata parsing: amounts, dates, signatories, and anomaly detection.',
            },
            {
              icon: Zap,
              title: 'Cross-Doc Intelligence',
              desc: 'Synthesize insights, surface contradictions, and verify compliance across documents.',
            },
            {
              icon: ShieldCheck,
              title: 'Audit & Analytics',
              desc: 'Immutable audit trail and exact per-query token & cost tracking down to the cent.',
            },
          ].map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className="p-6 rounded-2xl bg-[#12151f] border border-[#232733] hover:border-indigo-500/30 transition-all space-y-3"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-100">{f.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1c202a] py-8 text-center text-xs text-slate-500">
        SmartDocIQ &bull; Simplified Single-Path Architecture &bull; Local Execution Ready
      </footer>
    </div>
  );
};

