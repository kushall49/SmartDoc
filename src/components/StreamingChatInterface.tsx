'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Send, Loader2, Bot, User, Zap, BookOpen, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Citation {
  chunkIndex: number;
  text: string;
  score: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  streaming?: boolean;
}

interface StreamingChatInterfaceProps {
  documentId?: string;
  documentName?: string;
  crossDocument?: boolean; // search across ALL user docs
}

export function StreamingChatInterface({
  documentId,
  documentName,
  crossDocument = false,
}: StreamingChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [enableCrossDoc, setEnableCrossDoc] = useState(crossDocument);
  const [showCitations, setShowCitations] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load history on mount
  useEffect(() => {
    if (!documentId) return;
    fetch(`/api/chat?documentId=${documentId}`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data?.chats && data.data.chats.length > 0) {
          // Load messages from the most recent chat
          const latestChat = data.data.chats[0];
          if (latestChat.messages) {
            setMessages(latestChat.messages);
          }
        }
      })
      .catch(() => {});
  }, [documentId]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || streaming) return;

    const userMsg: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setStreaming(true);

    // Placeholder assistant message
    const assistantIndex = messages.length + 1;
    setMessages(prev => [
      ...prev,
      { role: 'assistant', content: '', streaming: true },
    ]);

    abortRef.current = new AbortController();

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.content,
          documentId: enableCrossDoc ? undefined : documentId,
          crossDocument: enableCrossDoc,
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Stream failed');
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let citations: Citation[] = [];
      let accumulated = '';

      let done = false;
      while (!done) {
        const { done: streamDone, value } = await reader.read();
        done = streamDone;
        if (!value) continue;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line.slice(6));

            if (parsed.type === 'citations') {
              citations = parsed.citations;
            } else if (parsed.type === 'token') {
              accumulated += parsed.token;
              setMessages(prev => {
                const updated = [...prev];
                updated[assistantIndex] = {
                  role: 'assistant',
                  content: accumulated,
                  streaming: true,
                };
                return updated;
              });
            } else if (parsed.type === 'done') {
              setMessages(prev => {
                const updated = [...prev];
                updated[assistantIndex] = {
                  role: 'assistant',
                  content: accumulated,
                  citations,
                  streaming: false,
                };
                return updated;
              });
            } else if (parsed.type === 'error') {
              throw new Error(parsed.message);
            }
          } catch {
            // ignore parse errors on individual SSE lines
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') {
        toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
        setMessages(prev => prev.filter((_, i) => i !== assistantIndex));
      }
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, documentId, enableCrossDoc, messages.length, toast]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Card className="flex flex-col h-full min-h-[600px]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Streaming AI Chat
            {documentName && (
              <Badge variant="secondary" className="text-xs">
                <BookOpen className="h-3 w-3 mr-1" />
                {documentName}
              </Badge>
            )}
          </CardTitle>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCitations(s => !s)}
              className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                showCitations ? 'bg-blue-100 border-blue-400 text-blue-700' : 'border-gray-200 text-gray-500'
              }`}
            >
              Citations
            </button>
            <button
              onClick={() => setEnableCrossDoc(s => !s)}
              className={`text-xs px-2 py-1 rounded-md border flex items-center gap-1 transition-colors ${
                enableCrossDoc ? 'bg-purple-100 border-purple-400 text-purple-700' : 'border-gray-200 text-gray-500'
              }`}
            >
              <Globe className="h-3 w-3" />
              All Docs
            </button>
          </div>
        </div>

        {enableCrossDoc && (
          <p className="text-xs text-purple-600 mt-1">
            Cross-document mode: searching across all your uploaded documents.
          </p>
        )}
      </CardHeader>

      <Separator />

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm gap-2">
            <Bot className="h-8 w-8" />
            <p>Ask anything about your document{enableCrossDoc ? 's' : ''}.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-blue-600" />
              </div>
            )}

            <div className={`max-w-[80%] space-y-1 ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
              <div
                className={`rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {msg.content}
                {msg.streaming && (
                  <span className="inline-block w-1.5 h-4 bg-blue-400 animate-pulse ml-0.5 rounded" />
                )}
              </div>

              {showCitations && msg.citations && msg.citations.length > 0 && (
                <div className="text-xs text-gray-500 space-y-1 mt-1">
                  {msg.citations.slice(0, 3).map((c, ci) => (
                    <div key={ci} className="flex items-start gap-1 bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
                      <span className="font-semibold text-yellow-700">§{c.chunkIndex}</span>
                      <span className="line-clamp-2">{c.text}</span>
                      <span className="ml-auto text-yellow-600 font-mono">{(c.score * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-white" />
              </div>
            )}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </CardContent>

      <Separator />

      <div className="p-4 flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question… (Enter to send)"
          disabled={streaming}
          className="flex-1"
        />
        <Button onClick={sendMessage} disabled={streaming || !input.trim()} size="icon">
          {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </Card>
  );
}
