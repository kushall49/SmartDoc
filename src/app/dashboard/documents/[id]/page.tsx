'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// import { Separator } from '@/components/ui/separator';
import { Loading } from '@/components/Loading';
import { useToast } from '@/hooks/use-toast';
import { Document } from '@/types';
import {
  ArrowLeft,
  // FileText,
  // Download,
  MessageSquare,
  Trash2,
  // Calendar,
  // FileType,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDocument = async () => {
      try {
        const response = await fetch(`/api/documents/${params.id}`);
        const data = await response.json();

        if (data.success) {
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

    if (params.id) {
      loadDocument();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const response = await fetch(`/api/documents/${params.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Document deleted',
          description: 'The document has been successfully deleted',
        });
        router.push('/dashboard/documents');
      }
    } catch (error) {
      toast({
        title: 'Failed to delete document',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <Loading message="Loading document..." />;
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
            <h1 className="text-3xl font-bold tracking-tight">{document.originalName}</h1>
            <p className="text-muted-foreground mt-1">
              {format(new Date(document.createdAt), 'MMMM d, yyyy at h:mm a')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/dashboard/chat/${document._id}`)}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Chat
          </Button>
          <Button variant="outline" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Document Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge
                variant={
                  document.status.stage === 'completed'
                    ? 'success'
                    : document.status.stage === 'processing'
                    ? 'warning'
                    : document.status.stage === 'failed'
                    ? 'destructive'
                    : 'default'
                }
              >
                {document.status.stage}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">File Size</p>
              <p className="font-medium">
                {(document.fileSize / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <p className="font-medium capitalize">{document.documentType || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Format</p>
              <p className="font-medium">{document.fileType || 'Unknown'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {document.summary && (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>AI-generated document summary</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{document.summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Entities */}
      {document.entities && document.entities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Key Entities</CardTitle>
            <CardDescription>Extracted entities from the document</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {document.entities.map((entity, index) => (
                <Badge key={index} variant="outline" className="text-sm">
                  <span className="font-semibold">{entity.type}:</span>
                  <span className="ml-1">{entity.value}</span>
                  {entity.confidence && (
                    <span className="ml-1 text-xs opacity-70">
                      ({Math.round(entity.confidence * 100)}%)
                    </span>
                  )}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Anomaly Detection */}
      {document.anomalyScore !== null && document.anomalyScore !== undefined && (
        <Card
          className={
            document.anomalyScore > 50
              ? 'border-red-200 dark:border-red-900'
              : document.anomalyScore > 30
              ? 'border-yellow-200 dark:border-yellow-900'
              : ''
          }
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle
                className={`h-5 w-5 ${
                  document.anomalyScore > 50
                    ? 'text-red-600'
                    : document.anomalyScore > 30
                    ? 'text-yellow-600'
                    : 'text-green-600'
                }`}
              />
              Anomaly Detection
            </CardTitle>
            <CardDescription>
              Anomaly Score: {document.anomalyScore}/100
              {document.anomalyScore > 50 && ' - High Risk'}
              {document.anomalyScore > 30 && document.anomalyScore <= 50 && ' - Medium Risk'}
              {document.anomalyScore <= 30 && ' - Low Risk'}
            </CardDescription>
          </CardHeader>
          {document.anomalyDetails && (
            <CardContent>
              <p className="text-sm text-muted-foreground">{document.anomalyDetails}</p>
            </CardContent>
          )}
        </Card>
      )}

      {/* Extracted Text */}
      {document.extractedText && (
        <Card>
          <CardHeader>
            <CardTitle>Extracted Text</CardTitle>
            <CardDescription>
              Full text extracted from the document ({document.extractedText.length} characters)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto rounded-lg bg-muted p-4">
              <pre className="text-sm whitespace-pre-wrap font-mono">
                {document.extractedText}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
