'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SearchResult {
  documentId: string;
  score: number;
  snippet: string;
}

interface SearchBarProps {
  userId: string;
  onResultClick?: (documentId: string) => void;
}

export function SearchBar({ userId, onResultClick }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(query)}&userId=${userId}&limit=10`
      );
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      setResults(data.results);

      if (data.results.length === 0) {
        toast({
          title: 'No results found',
          description: 'Try adjusting your search query',
        });
      }
    } catch (error) {
      toast({
        title: 'Search failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Search documents using natural language..."
          disabled={loading}
        />
        <Button onClick={handleSearch} disabled={loading || !query.trim()}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>

      {searched && results.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Found {results.length} result(s)
          </p>
          {results.map((result, index) => (
            <Card
              key={index}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onResultClick?.(result.documentId)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {result.snippet}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="text-xs font-medium text-primary">
                      {Math.round(result.score * 100)}% match
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {searched && results.length === 0 && !loading && (
        <div className="text-center py-8 text-muted-foreground">
          <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No documents found matching your search</p>
        </div>
      )}
    </div>
  );
}
