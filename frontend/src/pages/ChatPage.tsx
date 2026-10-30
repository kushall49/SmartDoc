import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { DocumentItem, Citation } from '../types';
import {
  MessageSquare,
  Send,
  StopCircle,
  Sparkles,
  Layers,
  FileText,
  User,
  Bot,
  Info,
  ChevronDown,
  Loader2,
} from 'lucide-react';

interface UIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Citation[];
  isStreaming?: boolean;
}

export const ChatPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialDocId = searchParams.get('docId') || '';

  const [selectedDocId, setSelectedDocId] = useState<string>(initialDocId);
  const [crossDocument, setCrossDocument] = useState<boolean>(!initialDocId);
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [expandedSource, setExpandedSource] = useState<Citation | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch list of documents for dropdown selector
  const { data: docData } = useQuery<{ success: boolean; documents: DocumentItem[] }>({
    queryKey: ['documents'],
    queryFn: () => api.get('/documents'),
  });

  const documents = docData?.documents || [];

  // Ensure selectedDocId defaults to the first available document
  useEffect(() => {
    if (!selectedDocId && documents.length > 0) {
      setSelectedDocId(documents[0].id);
    }
  }, [documents, selectedDocId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!inputMessage.trim() || isStreaming) return;

    const userText = inputMessage.trim();
    setInputMessage('');

    const userMsg: UIMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userText,
    };

    const assistantMsgId = `assistant-${Date.now()}`;
    const assistantMsg: UIMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      sources: [],
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const docIdToSend = crossDocument
      ? undefined
      : (selectedDocId || (documents.length > 0 ? documents[0].id : undefined));

    api.streamChat(
      {
        message: userText,
        documentId: docIdToSend,
        crossDocument,
        onSources: (sources) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsgId ? { ...m, sources } : m))
          );
        },
        onToken: (token) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, content: m.content + token }
                : m
            )
          );
        },
        onDone: (fullText) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, content: fullText || m.content, isStreaming: false }
                : m
            )
          );
          setIsStreaming(false);
          abortControllerRef.current = null;
        },
        onError: (err) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    content:
                      m.content +
                      `\n\n*[Notice: ${err.message}]*`,
                    isStreaming: false,
                  }
                : m
            )
          );
          setIsStreaming(false);
          abortControllerRef.current = null;
        },
      },
      abortController.signal
    );
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
      setMessages((prev) =>
        prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m))
      );
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
      {/* Chat Header & Mode Controls */}
      <div className="p-4 rounded-2xl bg-[#10131a] border border-[#232733] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">RAG Streaming Assistant</h1>
            <p className="text-[11px] text-slate-400">
              PostgreSQL pgvector cosine retrieval &bull; OpenAI GPT-4o Token Streaming
            </p>
          </div>
        </div>

        {/* Scope selector */}
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="flex items-center space-x-2 bg-[#161922] p-1 rounded-xl border border-[#232733]">
            <button
              onClick={() => {
                setCrossDocument(false);
                if (!selectedDocId && documents.length > 0) {
                  setSelectedDocId(documents[0].id);
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                !crossDocument
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Single Doc
            </button>
            <button
              onClick={() => setCrossDocument(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                crossDocument
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cross-Document
            </button>
          </div>

          {!crossDocument && (
            <select
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#161922] border border-[#232733] text-xs text-slate-200 focus:outline-none max-w-xs"
            >
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.documentType || 'doc'})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 rounded-2xl bg-[#0c0e14] border border-[#232733] space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-3">
            <Bot className="w-12 h-12 text-slate-700" />
            <h3 className="text-sm font-semibold text-slate-300">
              {crossDocument
                ? 'Ask a question across all your documents'
                : 'Ask a question about the selected document'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm">
              Answers include cited sources and page references retrieved via 1536-d pgvector HNSW search.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed space-y-3 ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none'
                    : 'bg-[#151822] text-slate-200 border border-[#232733] rounded-bl-none shadow-sm'
                }`}
              >
                <div className="whitespace-pre-wrap leading-relaxed">
                  {msg.content.split('\n').map((line, lIdx) => {
                    const parts = line.split(/(\*\*[^*]+\*\*)/g);
                    return (
                      <div key={lIdx} className="min-h-[1.2rem]">
                        {parts.map((part, pIdx) => {
                          if (part.startsWith('**') && part.endsWith('**')) {
                            return (
                              <span key={pIdx} className="font-semibold text-slate-100">
                                {part.slice(2, -2)}
                              </span>
                            );
                          }
                          return part.replace(/\*\*/g, '');
                        })}
                      </div>
                    );
                  })}
                </div>

                {msg.isStreaming && (
                  <div className="flex items-center space-x-1.5 text-indigo-400 text-[10px] animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                    <span>Streaming tokens...</span>
                  </div>
                )}

                {/* Sources / Citations */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="pt-2 border-t border-[#232733] space-y-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-1">
                      <Sparkles className="w-3 h-3 text-indigo-400" />
                      <span>Verified Citations ({msg.sources.length})</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {msg.sources.map((src, i) => (
                        <button
                          key={i}
                          onClick={() => setExpandedSource(src)}
                          className="px-2 py-1 rounded bg-[#1f2433] hover:bg-[#282f42] border border-[#2d354a] text-[10px] text-indigo-300 font-mono flex items-center space-x-1 transition-colors"
                        >
                          <span>[{i + 1}]</span>
                          <span className="truncate max-w-[120px]">{src.documentName}</span>
                          {src.page && <span>p.{src.page}</span>}
                          <span className="text-emerald-400">({Math.round(src.similarity * 100)}%)</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-[#1c2130] text-slate-300 flex items-center justify-center shrink-0 border border-[#2b334a]">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-3 rounded-2xl bg-[#10131a] border border-[#232733] flex items-center space-x-3">
        <textarea
          rows={1}
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={
            crossDocument
              ? 'Query across your entire document repository...'
              : 'Ask a specific question about this document...'
          }
          className="flex-1 bg-transparent border-none focus:outline-none text-xs text-slate-100 placeholder:text-slate-500 resize-none px-2 py-1"
        />

        {isStreaming ? (
          <button
            onClick={handleStop}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white flex items-center space-x-1.5 transition-colors shadow-sm"
          >
            <StopCircle className="w-4 h-4" />
            <span>Stop</span>
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!inputMessage.trim()}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-semibold text-white flex items-center space-x-1.5 transition-all shadow-glow"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        )}
      </div>

      {/* Citation Details Drawer Modal */}
      {expandedSource && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#10131a] border border-[#232733] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>Citation Source Chunk</span>
              </h3>
              <button
                onClick={() => setExpandedSource(null)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                &times;
              </button>
            </div>

            <div className="text-xs space-y-1">
              <div className="text-slate-300 font-semibold">{expandedSource.documentName}</div>
              <div className="text-[11px] text-slate-500">
                Page {expandedSource.page || 'N/A'} &bull; Cosine Similarity: {(expandedSource.similarity * 100).toFixed(1)}%
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0a0c10] border border-[#1e222e] max-h-60 overflow-y-auto text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
              {expandedSource.chunkText}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setExpandedSource(null)}
                className="px-4 py-2 rounded-xl bg-[#1c2130] hover:bg-[#252c40] text-xs font-medium text-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

