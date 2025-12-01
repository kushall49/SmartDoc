'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { ChatInterface } from '@/components/ChatInterface';
import { Loading } from '@/components/Loading';
import { useToast } from '@/hooks/use-toast';
import { Document } from '@/types';
import { ArrowLeft, FileText } from 'lucide-react';

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDocument = async () => {
      if (!session?.user?.id) return;
      try {
        const response = await fetch(`/api/documents/${params.id}`);
        const data = await response.json();

        if (data.success) {
          if (data.document.status.stage !== 'completed') {
            toast({
              title: 'Document not ready',
              description: 'This document is still being processed. Please wait.',
              variant: 'destructive',
            });
            router.push('/dashboard/documents');
            return;
          }
          setDocument(data.document);
        } else {
          toast({
            title: 'Document not found',
            description: data.error,
            variant: 'destructive',
          });
          router.push('/dashboard/documents');
        }
      } catch (error) {
        toast({
          title: 'Failed to load document',
          description: error instanceof Error ? error.message : 'An error occurred',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    if (params.id && session?.user?.id) {
      loadDocument();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, session]);

  if (loading) {
    return <Loading message="Loading chat..." />;
  }

  if (!document) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Chat with Document</h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {document.originalName}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/documents/${document._id}`)}
        >
          View Details
        </Button>
      </div>

      {/* Chat Interface */}
      {session?.user?.id && (
        <ChatInterface
          documentId={document._id}
          userId={session.user.id}
          documentName={document.originalName}
        />
      )}
    </div>
  );
}
