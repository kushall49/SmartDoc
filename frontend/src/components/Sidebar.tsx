import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Files,
  UploadCloud,
  MessageSquare,
  Search,
  GitCompare,
  Cpu,
  ShieldCheck,
  BarChart3,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/documents', label: 'Documents', icon: Files },
  { to: '/upload', label: 'Upload', icon: UploadCloud },
  { to: '/chat', label: 'RAG Chat', icon: MessageSquare },
  { to: '/search', label: 'Semantic Search', icon: Search },
  { to: '/compare', label: 'Compare Docs', icon: GitCompare },
  { to: '/intelligence', label: 'Intelligence Scan', icon: Cpu },
  { to: '/audit', label: 'Audit Trail', icon: ShieldCheck },
  { to: '/analytics', label: 'Cost Analytics', icon: BarChart3 },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 border-r border-[#232733] bg-[#0c0e13] flex flex-col justify-between p-4 shrink-0">
      <div className="space-y-1">
        <div className="px-3 pb-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Workspace Navigation
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#161922]'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      <div className="p-3 rounded-xl bg-[#12151e] border border-[#232733] text-[11px] text-slate-400 space-y-1">
        <div className="flex items-center space-x-1.5 font-medium text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Engine Status</span>
        </div>
        <div className="text-[10px] text-slate-500">
          PostgreSQL 18 + pgvector HNSW
        </div>
        <div className="text-[10px] text-indigo-400 font-mono">
          Direct OpenAI gpt-4o
        </div>
      </div>
    </aside>
  );
};

