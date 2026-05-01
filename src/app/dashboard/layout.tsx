'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
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
  ClipboardList,
  LogOut,
  Menu,
  X,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
  { label: 'Audit Trail', href: '/dashboard/audit', icon: ClipboardList },
];

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
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        isActive
          ? 'bg-indigo-600 text-white'
          : 'text-slate-400 hover:text-white hover:bg-slate-700'
      )}
    >
      <Icon size={18} />
      {label}
    </Link>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebar = (
    <div className="flex flex-col h-full py-6 px-4">
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 mb-8">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
          <Zap size={18} className="text-white" />
        </div>
        <span className="text-white font-bold text-lg">SmartDocIQ</span>
      </div>

      {/* Core nav */}
      <div className="space-y-1 mb-6">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">
          Core
        </p>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            {...item}
            onClick={() => setMobileOpen(false)}
          />
        ))}
      </div>

      {/* AI features nav */}
      <div className="space-y-1 mb-6">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">
          AI Features
        </p>
        {AI_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            {...item}
            onClick={() => setMobileOpen(false)}
          />
        ))}
      </div>

      {/* User + sign out */}
      <div className="mt-auto border-t border-slate-700 pt-4">
        <div className="flex items-center gap-3 px-3 mb-3">
          <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
            {session?.user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">
              {session?.user?.name ?? 'User'}
            </p>
            <p className="text-xs text-slate-400 truncate">
              {session?.user?.email ?? ''}
            </p>
          </div>
        </div>
        <button
          suppressHydrationWarning
          onClick={() => signOut({ callbackUrl: '/auth/signin' })}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-950">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 border-r border-slate-800 shrink-0">
        {sidebar}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60" />
          <aside
            className="absolute left-0 top-0 h-full w-64 bg-slate-900 z-50"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebar}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-slate-400 hover:text-white"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center">
              <Zap size={14} className="text-white" />
            </div>
            <span className="text-white font-bold">SmartDocIQ</span>
          </div>
          <div className="w-6" />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-slate-950 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
