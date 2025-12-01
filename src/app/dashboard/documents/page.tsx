'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { DocumentCard } from '@/components/DocumentCard';
import { Loading } from '@/components/Loading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Document } from '@/types';
import { Search, RefreshCw } from 'lucide-react';

export default function DocumentsPage() {
  const { data: session } = useSession();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const router = useRouter();
  const { toast } = useToast();

  const loadDocuments = useCallback(async () => {
    if (!session?.user?.id) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        userId: session.user.id,
        limit: '50',
        skip: '0',
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/documents?${params}`);
      const data = await response.json();

      if (data.success) {
        setDocuments(data.documents);
      }
    } catch (error) {
      toast({
        title: 'Failed to load documents',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, statusFilter, toast]);

  useEffect(() => {
    if (session?.user?.id) {
      loadDocuments();
    }
  }, [statusFilter, session, loadDocuments]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Document deleted',
          description: 'The document has been successfully deleted',
        });
        loadDocuments();
      }
    } catch (error) {
      toast({
        title: 'Failed to delete document',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleChat = (id: string) => {
    router.push(`/dashboard/chat/${id}`);
  };

  const handleView = (id: string) => {
    router.push(`/dashboard/documents/${id}`);
  };

  const filteredDocuments = documents.filter((doc) =>
    doc.originalName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusCounts = {
    all: documents.length,
    completed: documents.filter((d) => d.status.stage === 'completed').length,
    processing: documents.filter((d) => d.status.stage === 'processing').length,
    failed: documents.filter((d) => d.status.stage === 'failed').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground mt-2">
            Manage and view all your uploaded documents
          </p>
        </div>
        <Button onClick={loadDocuments} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            className="cursor-pointer px-3 py-1"
            onClick={() => setStatusFilter('all')}
          >
            All ({statusCounts.all})
          </Badge>
          <Badge
            variant={statusFilter === 'completed' ? 'success' : 'outline'}
            className="cursor-pointer px-3 py-1"
            onClick={() => setStatusFilter('completed')}
          >
            Completed ({statusCounts.completed})
          </Badge>
          <Badge
            variant={statusFilter === 'processing' ? 'warning' : 'outline'}
            className="cursor-pointer px-3 py-1"
            onClick={() => setStatusFilter('processing')}
          >
            Processing ({statusCounts.processing})
          </Badge>
          <Badge
            variant={statusFilter === 'failed' ? 'destructive' : 'outline'}
            className="cursor-pointer px-3 py-1"
            onClick={() => setStatusFilter('failed')}
          >
            Failed ({statusCounts.failed})
          </Badge>
        </div>
      </div>

      {/* Documents Grid */}
      {loading ? (
        <Loading message="Loading documents..." />
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchTerm
              ? 'No documents found matching your search'
              : 'No documents yet. Upload your first document to get started!'}
          </p>
          {!searchTerm && (
            <Button className="mt-4" onClick={() => router.push('/dashboard/upload')}>
              Upload Document
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDocuments.map((doc) => (
            <DocumentCard
              key={doc._id}
              document={doc}
              onDelete={handleDelete}
              onChat={handleChat}
              onView={handleView}
            />
          ))}
        </div>
      )}
    </div>
  );
}
