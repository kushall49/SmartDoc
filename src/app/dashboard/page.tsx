'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/Loading';
import { FileText, Upload, CheckCircle, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface Stats {
  total: number;
  completed: number;
  processing: number;
  failed: number;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      if (!session?.user?.id) return;
      
      try {
        const response = await fetch(`/api/documents?userId=${session.user.id}&limit=1000`);
        const data = await response.json();

        if (data.success) {
          const documents = data.documents;
          const stats: Stats = {
            total: documents.length,
            completed: documents.filter((d: any) => d.status.stage === 'completed').length,
            processing: documents.filter((d: any) => d.status.stage === 'processing').length,
            failed: documents.filter((d: any) => d.status.stage === 'failed').length,
          };
          setStats(stats);
        }
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
    const interval = setInterval(loadStats, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [session]);

  if (loading) {
    return <Loading message="Loading dashboard..." />;
  }

  const statCards = [
    {
      title: 'Total Documents',
      value: stats?.total || 0,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      title: 'Completed',
      value: stats?.completed || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      title: 'Processing',
      value: stats?.processing || 0,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    },
    {
      title: 'Failed',
      value: stats?.failed || 0,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back! Here&apos;s an overview of your documents.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Get started with your documents</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Button asChild className="h-auto flex-col items-start p-4 space-y-2">
            <Link href="/dashboard/upload">
              <Upload className="h-8 w-8 mb-2" />
              <div className="text-left">
                <div className="font-semibold">Upload Documents</div>
                <div className="text-xs font-normal opacity-90">
                  Upload PDF, images, or DOCX files
                </div>
              </div>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto flex-col items-start p-4 space-y-2">
            <Link href="/dashboard/documents">
              <FileText className="h-8 w-8 mb-2" />
              <div className="text-left">
                <div className="font-semibold">View Documents</div>
                <div className="text-xs font-normal opacity-90">
                  Browse and manage your documents
                </div>
              </div>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto flex-col items-start p-4 space-y-2">
            <Link href="/dashboard/search">
              <TrendingUp className="h-8 w-8 mb-2" />
              <div className="text-left">
                <div className="font-semibold">Semantic Search</div>
                <div className="text-xs font-normal opacity-90">
                  Search documents using AI
                </div>
              </div>
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Getting Started */}
      {stats && stats.total === 0 && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Get Started</CardTitle>
            <CardDescription>
              Upload your first document to experience the power of AI document intelligence
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
                  1
                </span>
                Upload a Document
              </h4>
              <p className="text-sm text-muted-foreground ml-8">
                Upload a PDF, image (PNG/JPG), or DOCX file up to 10MB
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
                  2
                </span>
                AI Processing
              </h4>
              <p className="text-sm text-muted-foreground ml-8">
                Our AI extracts text, generates summaries, identifies entities, and classifies your document
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
                  3
                </span>
                Explore Insights
              </h4>
              <p className="text-sm text-muted-foreground ml-8">
                Search semantically, chat with your documents, and extract valuable insights
              </p>
            </div>
            <Button asChild className="w-full">
              <Link href="/dashboard/upload">
                <Upload className="h-4 w-4 mr-2" />
                Upload Your First Document
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
