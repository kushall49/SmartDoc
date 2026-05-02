'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Upload, MessageSquare, Search, TrendingUp, Clock, Zap, LogOut } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ✅ Interface unchanged
interface DashboardStats {
  totalDocs: number;
  readyDocs: number;
  processingDocs: number;
  failedDocs: number;
  totalCalls: number;
  totalCost: number;
}

export default function DashboardPage() {
  // ✅ All state + session logic untouched
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentDocs, setRecentDocs] = useState<Array<{
    _id: string;
    name: string;
    status: string;
    documentType?: string;
    createdAt: string;
  }>>([]);

  // ✅ Both API calls completely untouched
  useEffect(() => {
    fetch('/api/documents?limit=5')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setRecentDocs(d.data.documents.slice(0, 5));
      })
      .catch(() => void 0);

    fetch('/api/analytics')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const ds = (d.data.documentStats ?? {}) as Record<string, number>;
          setStats({
            totalDocs: Object.values(ds).reduce((a, b) => a + b, 0),
            readyDocs: ds['ready'] ?? 0,
            processingDocs: (ds['processing'] ?? 0) + (ds['pending'] ?? 0),
            failedDocs: ds['failed'] ?? 0,
            totalCalls: d.data.totalCalls ?? 0,
            totalCost: d.data.totalCost ?? 0,
          });
        }
      })
      .catch(() => void 0);
  }, []);

  // Quick actions — same hrefs, updated colors
  const quickActions = [
    { label: 'Upload Document', href: '/dashboard/upload', icon: Upload, primary: true },
    { label: 'Chat with Doc', href: '/dashboard/chat', icon: MessageSquare },
    { label: 'Search Docs', href: '/dashboard/search', icon: Search },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.1),transparent_40%),radial-gradient(circle_at_bottom,rgba(56,189,248,0.06),transparent_34%)]" />
      
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-foreground/10 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image src="/smartdoc-logo.svg" alt="SmartDoc logo" width={48} height={48} className="h-12 w-auto" />
              <span className="text-xl font-bold text-foreground">SmartDoc</span>
            </div>
            
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 text-foreground/70 hover:text-foreground transition-colors"
            >
              <LogOut size={18} />
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Main content */}
        <div className="max-w-7xl mx-auto px-6 py-12">
          {/* Page header */}
          <div className="mb-12">
            <h1
              className={cn(
                'font-normal leading-[1.02] tracking-[-0.024em] text-transparent bg-clip-text',
                'text-[clamp(2.25rem,6vw,48px)] mb-2'
              )}
              style={{ fontFamily: "'General Sans', 'Geist Sans', sans-serif", backgroundImage: 'linear-gradient(223deg, #E8E8E9 0%, #3A7BBF 104.15%)' }}
            >
              Welcome back
              {session?.user?.name && (
                <span className="ml-2 text-primary">{session.user.name.split(' ')[0]}</span>
              )}
            </h1>

            <p className="text-foreground/70 text-lg">
              Your AI document intelligence dashboard
            </p>
          </div>

          {/* Stats cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {[
                {
                  label: 'Total Documents',
                  value: String(stats.totalDocs),
                  icon: FileText,
                  sub: `${stats.readyDocs} ready`,
                },
                {
                  label: 'Processing',
                  value: String(stats.processingDocs),
                  icon: Clock,
                  sub: stats.failedDocs > 0 ? `${stats.failedDocs} failed` : 'All good',
                },
                {
                  label: 'AI Calls',
                  value: String(stats.totalCalls),
                  icon: Zap,
                  sub: 'Last 30 days',
                },
                {
                  label: 'AI Cost',
                  value: `$${stats.totalCost.toFixed(4)}`,
                  icon: TrendingUp,
                  sub: 'Last 30 days',
                },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.label}
                    className={cn(
                      'relative overflow-hidden rounded-2xl p-6',
                      'border border-foreground/10 backdrop-blur-sm',
                      'bg-gradient-to-br from-foreground/5 via-foreground/[0.02] to-foreground/5',
                      'transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_32px_rgba(139,92,246,0.15)]'
                    )}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
                    
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-semibold uppercase tracking-wider text-foreground/60">
                          {s.label}
                        </span>
                        <div className="p-2 rounded-lg bg-primary/10 ring-1 ring-primary/20">
                          <Icon size={16} className="text-primary" />
                        </div>
                      </div>
                      
                      <p className="text-3xl font-bold text-foreground mb-2">
                        {s.value}
                      </p>
                      
                      <p className="text-sm text-foreground/70">
                        {s.sub}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick Actions */}
          <div className="mb-12">
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground/60 mb-4">
              Quick Actions
            </h2>
            <div className="flex flex-wrap gap-3">
              {quickActions.map((a) => {
                const Icon = a.icon;
                return (
                  <Link key={a.href} href={a.href}>
                    <Button
                      variant={a.primary ? "hero" : "heroSecondary"}
                      size="lg"
                      className="flex items-center gap-2"
                    >
                      <Icon size={16} />
                      {a.label}
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Recent Documents */}
          {recentDocs.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-foreground/60">
                  Recent Documents
                </h2>
                <Link
                  href="/dashboard/documents"
                  className="text-sm font-semibold text-primary hover:text-primary/90 transition-colors"
                >
                  View all →
                </Link>
              </div>

              <div className="space-y-3">
                {recentDocs.map((doc) => (
                  <Link
                    key={doc._id}
                    href={`/dashboard/documents/${doc._id}`}
                    className={cn(
                      'group relative overflow-hidden rounded-xl p-4',
                      'border border-foreground/10 backdrop-blur-sm',
                      'bg-gradient-to-br from-foreground/5 via-foreground/[0.02] to-foreground/5',
                      'transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_32px_rgba(139,92,246,0.15)]'
                    )}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    <div className="relative z-10 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                          <FileText size={16} className="text-primary" />
                        </div>
                        <span className="text-foreground font-semibold truncate">
                          {doc.name}
                        </span>
                      </div>

                      <span
                        className={cn(
                          'text-xs px-3 py-1 rounded-full font-semibold flex-shrink-0 ml-4',
                          doc.status === 'ready'
                            ? 'bg-green-500/10 text-green-400'
                            : doc.status === 'failed'
                              ? 'bg-red-500/10 text-red-400'
                              : 'bg-yellow-500/10 text-yellow-400'
                        )}
                      >
                        {doc.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {recentDocs.length === 0 && !stats && (
            <div
              className={cn(
                'text-center py-20 rounded-2xl',
                'border border-foreground/10 backdrop-blur-sm',
                'bg-gradient-to-br from-foreground/5 via-foreground/[0.02] to-foreground/5'
              )}
            >
              <div className="mb-4 inline-flex p-3 rounded-xl bg-primary/10 ring-1 ring-primary/20">
                <FileText size={24} className="text-primary" />
              </div>

              <h3 className="text-foreground font-bold text-2xl mb-2" style={{ fontFamily: "'General Sans', 'Geist Sans', sans-serif" }}>No documents yet</h3>
              <p className="text-foreground/70 mb-8">
                Upload your first document to get started
              </p>

              <Link href="/dashboard/upload">
                <Button variant="hero" size="lg" className="inline-flex items-center gap-2">
                  <Upload size={16} />
                  Upload Document
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
