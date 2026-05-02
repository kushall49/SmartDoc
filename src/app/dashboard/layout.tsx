'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  Search,
  Upload,
  MessageSquare,
  GitCompare,
  Brain,
  BarChart3,
  Menu,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Nav items unchanged ──────────────────────────────────────────────────────
const NAV_ITEMS = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Documents', href: '/dashboard/documents', icon: FileText },
  { label: 'Upload', href: '/dashboard/upload', icon: Upload },
  { label: 'Search', href: '/dashboard/search', icon: Search },
  { label: 'AI Chat', href: '/dashboard/chat', icon: MessageSquare },
];

const AI_ITEMS = [
  { label: 'Compare Docs', href: '/dashboard/compare', icon: GitCompare },
  { label: 'Intelligence', href: '/dashboard/intelligence', icon: Brain },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
];

// ─── NavLink — logic identical, only classes changed ─────────────────────────
function NavLink({
  href,
  icon: Icon,
  label,
  onClick,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  // ✅ Active logic untouched
  const isActive =
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(href);

  return (
    <Link
      href={href}
      onClick={onClick}
      prefetch={false}
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-150',
        isActive
          ? 'bg-[rgba(124,58,237,0.16)] border border-[rgba(124,58,237,0.28)] text-white shadow-[0_6px_24px_rgba(124,58,237,0.14)]'
          : 'border border-transparent text-[#bdb6c2] hover:text-white hover:bg-[rgba(255,255,255,0.02)]'
      )}
    >
      <Icon
        size={18}
        className={isActive ? 'text-white' : 'text-[#9aa0a6]'}
      />
      <span className="truncate">{label}</span>
      {isActive && (
        <span className="ml-auto w-2 h-2 rounded-full bg-[#a78bfa] flex-shrink-0" />
      )}
    </Link>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#6b6b77] px-3 mb-2">
      {children}
    </p>
  );
}

// ─── Main layout — ALL logic identical, only bg/border classes changed ────────
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebar = (
    <div className="flex flex-col h-full py-5 px-3">

      {/* ── Logo ── */}
        <div className="flex items-center gap-3 px-2 mb-7">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-[0_10px_30px_rgba(124,58,237,0.18)] backdrop-blur-md"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <Zap size={18} className="text-white" />
        </div>
        <span className="sr-only">SmartDocIQ</span>
      </div>

      {/* ── Core nav ── */}
      <div className="space-y-0.5 mb-5">
        <SectionLabel>Core</SectionLabel>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            {...item}
            onClick={() => setMobileOpen(false)}
          />
        ))}
      </div>

      {/* ── AI Features nav ── */}
      <div className="space-y-0.5 mb-5">
        <SectionLabel>AI Features</SectionLabel>
        {AI_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            {...item}
            onClick={() => setMobileOpen(false)}
          />
        ))}
      </div>

    </div>
  );

  return (
    // ── Root: pure black base ──
    <div className="flex h-screen" style={{ background: '#050508' }}>

      {/* ── Desktop sidebar ── */}
      <aside
        className="hidden lg:flex flex-col shrink-0"
        style={{
          width: '216px',
          background: '#000',
          borderRight: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        {sidebar}
      </aside>

      {/* ── Mobile sidebar overlay — logic untouched ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div className="absolute inset-0 bg-black/70" />
          <aside
            className="absolute left-0 top-0 h-full z-50"
            style={{
              width: '216px',
              background: '#000',
              borderRight: '1px solid rgba(255,255,255,0.04)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {sidebar}
          </aside>
        </div>
      )}

      {/* ── Main content area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Mobile header ── */}
        <header
          className="lg:hidden flex items-center justify-between px-4 py-3"
          style={{
            background: '#000',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            className="transition-colors"
            style={{ color: '#3d3d4d' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#fff')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#3d3d4d')}
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shadow-[0_8px_24px_rgba(124,58,237,0.14)] backdrop-blur-sm"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)', border: '1px solid rgba(255,255,255,0.04)' }}
            >
              <Zap size={16} className="text-white" />
            </div>
            <span className="sr-only">SmartDocIQ</span>
          </div>

          {/* Spacer to balance the menu button */}
          <div className="w-5" />
        </header>

        {/* ── Page content — visual polish to match Home UI ── */}
        <main className="flex-1 overflow-auto p-4 lg:p-8 relative" style={{ background: '#050508' }}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.1),transparent_40%),radial-gradient(circle_at_bottom,rgba(56,189,248,0.06),transparent_34%)]" />
          <div className="relative z-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
