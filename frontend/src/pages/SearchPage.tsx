import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { SearchResultItem } from '../types';
import {
  Search,
  Filter,
  FileText,
  Calendar,
  Layers,
  ArrowRight,
  Sparkles,
  Loader2,
  Tag,
} from 'lucide-react';

export const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [docType, setDocType] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data, isLoading, isFetching } = useQuery<{
    success: boolean;
    query: string;
    total: number;
    results: SearchResultItem[];
  }>({
    queryKey: ['search', submittedQuery, docType, dateFrom, dateTo],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('q', submittedQuery);
      if (docType !== 'all') params.set('type', docType);
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      return api.get(`/search?${params.toString()}`);
    },
    enabled: submittedQuery.trim().length >= 2,
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length >= 2) {
      setSubmittedQuery(query.trim());
    }
  };

  const results = data?.results || [];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Semantic Vector Search</h1>
        <p className="text-xs text-slate-400 mt-1">
          Perform cosine distance similarity queries directly in PostgreSQL 18 pgvector.
        </p>
      </div>

      {/* Search Bar & Filters Form */}
      <form onSubmit={handleSearchSubmit} className="p-5 rounded-2xl bg-[#10131a] border border-[#232733] space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search concepts, contract clauses, revenue numbers, liabilities..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#161922] border border-[#262b3a] focus:border-indigo-500 focus:outline-none text-xs text-slate-100 placeholder:text-slate-500"
            />
          </div>
          <button
            type="submit"
            disabled={query.trim().length < 2 || isFetching}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-semibold text-white flex items-center space-x-2 transition-all shadow-glow"
          >
            {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>Search</span>
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#1d222e] text-xs">
          <div className="flex items-center space-x-1.5 text-slate-400 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Doc Type Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 text-[11px]">Type:</span>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-[#161922] border border-[#262b3a] text-xs text-slate-300 focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="invoice">Invoice</option>
              <option value="contract">Contract</option>
              <option value="resume">Resume</option>
              <option value="report">Report</option>
              <option value="legal">Legal Document</option>
              <option value="image">Image Scan</option>
            </select>
          </div>

          {/* Date Range Filters */}
          <div className="flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500 text-[11px]">From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-2 py-1 rounded-lg bg-[#161922] border border-[#262b3a] text-xs text-slate-300 focus:outline-none"
            />
            <span className="text-slate-500 text-[11px]">To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-2 py-1 rounded-lg bg-[#161922] border border-[#262b3a] text-xs text-slate-300 focus:outline-none"
            />
          </div>

          {(docType !== 'all' || dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => {
                setDocType('all');
                setDateFrom('');
                setDateTo('');
              }}
              className="text-[11px] text-rose-400 hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </form>

      {/* Results Section */}
      <div className="space-y-4">
        {submittedQuery && (
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>
              Found <strong className="text-white">{results.length}</strong> semantic matches for "
              <span className="text-indigo-400">{submittedQuery}</span>"
            </span>
            <span className="font-mono text-[10px] text-slate-500">
              pgvector 1536-d HNSW Cosine Distance
            </span>
          </div>
        )}

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-xs">Computing embeddings & searching vector index...</p>
          </div>
        ) : submittedQuery && results.length === 0 ? (
          <div className="py-16 text-center text-slate-500 space-y-3 bg-[#10131a] border border-[#232733] rounded-2xl">
            <Search className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-xs text-slate-400 font-medium">No chunks matched your query above threshold.</p>
          </div>
        ) : (
          results.map((item, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-[#10131a] border border-[#232733] hover:border-indigo-500/40 transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <Link
                    to={`/documents/${item.documentId}`}
                    className="text-sm font-bold text-slate-100 hover:text-indigo-400 flex items-center space-x-1.5"
                  >
                    <span>{item.documentName}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <span className="px-2 py-0.5 rounded bg-[#161922] text-slate-400 font-mono text-[10px] uppercase">
                    {item.documentType}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <span className="text-xs font-mono font-semibold text-emerald-400">
                      {(item.score * 100).toFixed(0)}% match
                    </span>
                    <div className="w-16 h-1.5 rounded-full bg-[#1e2330] overflow-hidden mt-0.5">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400"
                        style={{ width: `${item.score * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0c0e14] border border-[#1d222e] text-xs font-mono text-slate-300 leading-relaxed whitespace-pre-wrap">
                {item.chunkText}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center space-x-2">
                  {item.pageNumber && <span>Page {item.pageNumber}</span>}
                  {item.keywords && item.keywords.length > 0 && (
                    <div className="flex items-center space-x-1">
                      <Tag className="w-3 h-3 text-cyan-400" />
                      <span>{item.keywords.slice(0, 3).join(', ')}</span>
                    </div>
                  )}
                </div>

                <Link
                  to={`/chat?docId=${item.documentId}`}
                  className="text-indigo-400 hover:underline font-semibold flex items-center space-x-1"
                >
                  <span>Chat with Doc</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

