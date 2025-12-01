'use client';

// import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUpload } from '@/components/FileUpload';
import { Loading } from '@/components/Loading';
import { useToast } from '@/hooks/use-toast';

export default function UploadPage() {
  // const router = useRouter(); // Unused for now
  const { data: session } = useSession();
  const { toast } = useToast();

  if (!session?.user?.id) {
    return <Loading message="Loading..." />;
  }

  const handleUploadComplete = (_documentId: string) => {
    toast({
      title: 'Upload successful',
      description: 'Your document is being processed. You can view it in the documents page.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Upload Documents</h1>
        <p className="text-muted-foreground mt-2">
          Upload documents for AI-powered analysis and insights
        </p>
      </div>

      {/* Upload Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Upload Files</CardTitle>
              <CardDescription>
                Drag and drop files or click to browse. Maximum 5 files at a time, 10MB each.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileUpload userId={session.user.id} onUploadComplete={handleUploadComplete} />
            </CardContent>
          </Card>
        </div>

        {/* Info Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Supported Formats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-lg">📄</span>
                <span>PDF Documents</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🖼️</span>
                <span>Images (PNG, JPG, JPEG)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">📝</span>
                <span>Word Documents (DOCX)</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">What Happens Next?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex gap-2">
                <span className="font-bold text-primary">1.</span>
                <div>
                  <strong className="text-foreground">Text Extraction</strong>
                  <p className="text-xs mt-1">OCR technology extracts all text content</p>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="font-bold text-primary">2.</span>
                <div>
                  <strong className="text-foreground">AI Analysis</strong>
                  <p className="text-xs mt-1">
                    Summarization, entity extraction, and classification
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="font-bold text-primary">3.</span>
                <div>
                  <strong className="text-foreground">Semantic Indexing</strong>
                  <p className="text-xs mt-1">Embeddings generated for intelligent search</p>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="font-bold text-primary">4.</span>
                <div>
                  <strong className="text-foreground">Ready to Chat</strong>
                  <p className="text-xs mt-1">
                    Use RAG to ask questions about your document
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-900/20">
            <CardHeader>
              <CardTitle className="text-base text-yellow-800 dark:text-yellow-200">
                💡 Pro Tip
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-yellow-700 dark:text-yellow-300">
              For best results, ensure your documents are clear and legible. Higher quality
              images produce better OCR results.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
