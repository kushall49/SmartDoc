'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchBar } from '@/components/SearchBar';
import { Loading } from '@/components/Loading';

export default function SearchPage() {
  const router = useRouter();
  const { data: session } = useSession();

  if (!session?.user?.id) {
    return <Loading message="Loading..." />;
  }

  const handleResultClick = (documentId: string) => {
    router.push(`/dashboard/documents/${documentId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Semantic Search</h1>
        <p className="text-muted-foreground mt-2">
          Search your documents using natural language powered by AI
        </p>
      </div>

      {/* Search Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Search Documents</CardTitle>
              <CardDescription>
                Ask questions or describe what you&apos;re looking for in natural language
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SearchBar userId={session.user.id} onResultClick={handleResultClick} />
            </CardContent>
          </Card>
        </div>

        {/* Info Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">How It Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex gap-2">
                <span className="font-bold text-primary">1.</span>
                <div>
                  <strong className="text-foreground">AI Understanding</strong>
                  <p className="text-xs mt-1">Your query is converted to semantic embeddings</p>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="font-bold text-primary">2.</span>
                <div>
                  <strong className="text-foreground">Similarity Matching</strong>
                  <p className="text-xs mt-1">Documents are ranked by semantic similarity</p>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="font-bold text-primary">3.</span>
                <div>
                  <strong className="text-foreground">Relevant Results</strong>
                  <p className="text-xs mt-1">
                    Get the most relevant documents even with different wording
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20">
            <CardHeader>
              <CardTitle className="text-base text-blue-800 dark:text-blue-200">
                💡 Search Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
              <p>• Use natural language instead of keywords</p>
              <p>• Ask questions about document content</p>
              <p>• Describe concepts rather than exact phrases</p>
              <p>• More specific queries yield better results</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Example Queries</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="p-2 rounded bg-muted">
                &quot;Documents about financial transactions&quot;
              </div>
              <div className="p-2 rounded bg-muted">
                &quot;Find contracts with payment terms&quot;
              </div>
              <div className="p-2 rounded bg-muted">&quot;Invoices from last quarter&quot;</div>
              <div className="p-2 rounded bg-muted">&quot;Documents mentioning John Smith&quot;</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
