'use client';

import { useEffect, useRef, useState, FormEvent, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Send, Loader2, Globe, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Source {
  documentId: string;
  documentName: string;
  chunkText: string;
  page?: number;
  similarity: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  provider?: string;
  model?: string;
  tokensUsed?: number;
  isStreaming?: boolean;
}

function SourceCard({ source }: { source: Source }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs">
      <div className="flex items-center justify-between mb-1">
        <span className="text-indigo-400 font-medium flex items-center gap-1">
          <FileText size={11} />
          {source.documentName}{source.page ? ` · p.${source.page}` : ''}
        </span>
        <span className="text-slate-500">{Math.round(source.similarity * 100)}% match</span>
      </div>
      <p className="text-slate-400 line-clamp-3">{source.chunkText}</p>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const [showSrc, setShowSrc] = useState(false);
  const isUser = msg.role === 'user';
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[80%] rounded-2xl px-4 py-3', isUser ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-100')}>
        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
        {!isUser && msg.isStreaming && <span className="inline-block w-1.5 h-4 bg-slate-400 animate-pulse ml-0.5 align-middle" />}
        {!isUser && msg.provider && !msg.isStreaming && (
          <p className="text-xs text-slate-500 mt-1">{msg.provider} · {msg.model}{msg.tokensUsed ? ` · ${msg.tokensUsed} tokens` : ''}</p>
        )}
        {!isUser && (msg.sources?.length ?? 0) > 0 && !msg.isStreaming && (
          <div className="mt-2">
            <button onClick={() => setShowSrc((s) => !s)} className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1">
              {showSrc ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {msg.sources!.length} source{msg.sources!.length !== 1 ? 's' : ''}
            </button>
            {showSrc && <div className="mt-2 space-y-2">{msg.sources!.map((s, i) => <SourceCard key={i} source={s} />)}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const params = useParams();
  const documentId = params.id as string;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [crossDocument, setCrossDocument] = useState(false);
  const [docName, setDocName] = useState('Document');
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch(`/api/documents/${documentId}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setDocName(d.data.document.name); })
      .catch(() => void 0);
  }, [documentId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = useCallback(async (e?: FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setLoading(true);
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setMessages((prev) => [...prev, { role: 'assistant', content: '', isStreaming: true }]);
    abortRef.current = new AbortController();
    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, documentId, crossDocument }),
        signal: abortRef.current.signal,
      });
      if (!res.ok || !res.body) throw new Error('Stream failed');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      let sources: Source[] = [];
      let streamDone = false;
      while (!streamDone) {
        const { done, value } = await reader.read();
        streamDone = done;
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const p = JSON.parse(line.slice(6));
            if (p.type === 'citations') { sources = p.citations; }
            else if (p.type === 'token') {
              acc += p.token;
              setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { ...u[u.length - 1], content: acc, isStreaming: true }; return u; });
            } else if (p.type === 'done') {
              setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { ...u[u.length - 1], content: acc, sources, isStreaming: false }; return u; });
            } else if (p.type === 'error') {
              throw new Error(p.error ?? 'Unknown streaming error');
            }
          } catch (parseError) {
            // Ignore malformed SSE payloads, but never swallow explicit server-side errors.
            const message = parseError instanceof Error ? parseError.message : String(parseError);
            if (message && message !== 'Unexpected end of JSON input') throw parseError;
          }
        }
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { role: 'assistant', content: `Error: ${(e as Error).message}`, isStreaming: false }; return u; });
      }
    } finally { setLoading(false); abortRef.current = null; }
  }, [input, loading, documentId, crossDocument]);

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white">{crossDocument ? 'All Documents' : docName}</h1>
          <p className="text-slate-400 text-xs mt-0.5">{crossDocument ? 'Searching across all your documents' : 'Chat with this document'}</p>
        </div>
        <button onClick={() => setCrossDocument((v) => !v)}
          className={cn('flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-colors',
            crossDocument ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white')}>
          <Globe size={13} />{crossDocument ? 'All Docs' : 'This Doc'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-12 h-12 bg-indigo-600/20 rounded-xl flex items-center justify-center mx-auto mb-3">
              <FileText size={24} className="text-indigo-400" />
            </div>
            <p className="text-slate-400 text-sm">Ask anything about {crossDocument ? 'your documents' : `"${docName}"`}</p>
          </div>
        )}
        {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} className="shrink-0 mt-2">
        <div className="flex gap-2 bg-slate-900 border border-slate-700 rounded-xl p-2 focus-within:border-indigo-500 transition-colors">
          <textarea value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }}
            placeholder="Ask a question… (Enter to send)"
            rows={1}
            className="flex-1 bg-transparent text-white text-sm placeholder:text-slate-500 resize-none focus:outline-none max-h-32 py-1 px-2"
          />
          <button type="submit" disabled={!input.trim() || loading}
            className="shrink-0 w-9 h-9 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg flex items-center justify-center transition-colors">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </form>
    </div>
  );
}
