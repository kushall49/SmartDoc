'use client';

import { Document } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { formatFileSize, getFileIcon } from '@/utils/file';
import { FileText, Trash2, MessageSquare, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface DocumentCardProps {
  document: Document;
  onDelete?: (id: string) => void;
  onChat?: (id: string) => void;
  onView?: (id: string) => void;
}

export function DocumentCard({ document, onDelete, onChat, onView }: DocumentCardProps) {
  const getStatusColor = () => {
    switch (document.status.stage) {
      case 'completed':
        return 'text-green-600';
      case 'processing':
        return 'text-blue-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = () => {
    switch (document.status.stage) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'processing':
        return <Clock className="h-4 w-4 animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            <span className="text-3xl">{getFileIcon(document.filename)}</span>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{document.originalName}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <span className={`flex items-center gap-1 ${getStatusColor()}`}>
                  {getStatusIcon()}
                  {document.status.stage}
                </span>
                <span>•</span>
                <span>{formatFileSize(document.fileSize)}</span>
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Processing Progress */}
        {document.status.stage === 'processing' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{document.status.message}</span>
              <span className="font-medium">{document.status.progress}%</span>
            </div>
            <Progress value={document.status.progress} />
          </div>
        )}

        {/* Error Message */}
        {document.status.stage === 'failed' && document.status.error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {document.status.error}
          </div>
        )}

        {/* Document Details */}
        {document.status.stage === 'completed' && (
          <div className="space-y-3">
            {document.documentType && (
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-medium capitalize">{document.documentType}</p>
              </div>
            )}

            {document.summary && (
              <div>
                <p className="text-sm text-muted-foreground">Summary</p>
                <p className="text-sm line-clamp-2">{document.summary}</p>
              </div>
            )}

            {document.entities && document.entities.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Key Entities</p>
                <div className="flex flex-wrap gap-1">
                  {document.entities.slice(0, 5).map((entity, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs"
                    >
                      {entity.value}
                    </span>
                  ))}
                  {document.entities.length > 5 && (
                    <span className="px-2 py-1 text-xs text-muted-foreground">
                      +{document.entities.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {document.anomalyScore != null && document.anomalyScore > 30 && (
              <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-sm">
                <p className="font-medium">⚠️ Anomaly Detected (Score: {document.anomalyScore})</p>
                <p className="text-xs mt-1">{document.anomalyDetails}</p>
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* Footer */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {format(new Date(document.createdAt), 'MMM d, yyyy HH:mm')}
          </p>

          <div className="flex gap-2">
            {document.status.stage === 'completed' && (
              <>
                <Button variant="outline" size="sm" onClick={() => onView?.(document._id)}>
                  <FileText className="h-4 w-4 mr-1" />
                  View
                </Button>
                <Button variant="outline" size="sm" onClick={() => onChat?.(document._id)}>
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Chat
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete?.(document._id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
