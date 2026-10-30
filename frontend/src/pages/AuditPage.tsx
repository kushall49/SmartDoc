import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { AuditLogItem } from '../types';
import {
  ShieldCheck,
  Download,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Filter,
} from 'lucide-react';

export const AuditPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const { data, isLoading } = useQuery<{ success: boolean; logs: AuditLogItem[] }>({
    queryKey: ['audit'],
    queryFn: () => api.get('/audit?limit=100'),
  });

  const logs = data?.logs || [];

  const filteredLogs = logs.filter((l) => {
    const matchesSearch =
      l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.resourceType && l.resourceType.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (l.resourceId && l.resourceId.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesAction = actionFilter === 'all' || l.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const uniqueActions = Array.from(new Set(logs.map((l) => l.action)));

  return (
    <div className="space-y-6">
      {/* Header with Export buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Enterprise Audit Trail</h1>
          <p className="text-xs text-slate-400 mt-1">
            Immutable tracking of document ingestion, RAG queries, exports, and access events.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <a
            href="/api/audit/export?format=csv"
            download
            className="px-3.5 py-2 rounded-xl bg-[#161a24] hover:bg-[#202534] border border-[#282e40] text-xs font-medium text-slate-200 flex items-center space-x-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </a>

          <a
            href="/api/audit/export?format=json"
            download
            className="px-3.5 py-2 rounded-xl bg-[#161a24] hover:bg-[#202534] border border-[#282e40] text-xs font-medium text-slate-200 flex items-center space-x-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export JSON</span>
          </a>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 rounded-2xl bg-[#10131a] border border-[#232733] flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by action, resource ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#161922] border border-[#262b3a] focus:border-indigo-500 focus:outline-none text-xs text-slate-100 placeholder:text-slate-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto">
          <span className="text-xs text-slate-500 flex items-center space-x-1">
            <Filter className="w-3 h-3" />
            <span>Action:</span>
          </span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-[#161922] border border-[#262b3a] text-xs text-slate-200 focus:outline-none"
          >
            <option value="all">All Actions ({logs.length})</option>
            {uniqueActions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl bg-[#10131a] border border-[#232733] overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-xs">Loading audit trail...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-slate-500 space-y-3">
            <ShieldCheck className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-xs text-slate-400 font-medium">No audit entries matching search.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#232733] text-slate-400 font-semibold bg-[#12151f]">
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Resource</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2330]">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#151922] transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      <span className="px-2 py-0.5 rounded bg-[#1c2130] text-indigo-300 font-mono text-[11px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      <div>{log.resourceType || 'system'}</div>
                      {log.resourceId && (
                        <div className="text-[10px] text-slate-500 font-mono truncate max-w-xs">
                          {log.resourceId}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {log.success ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-400 text-[11px] font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Success</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-rose-400 text-[11px] font-semibold">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Failed</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono">
                      {log.duration ? `${log.duration}ms` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400 text-[11px]">
                      {new Date(log.createdAt).toLocaleString()}
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

