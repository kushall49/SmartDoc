'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, FileText, Send, Loader2 } from 'lucide-react';

interface Document {
  _id: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  uploadDate: Date;
  processedDate?: Date;
  status: 'pending' | 'processing' | 'processed' | 'failed';
  metadata?: {
    pageCount?: number;
    wordCount?: number;
    language?: string;
  };
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ChatPage() {
  const { data: session } = useSession();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch documents
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await fetch('/api/documents');
        const data = await response.json();
        if (data.success) {
          setDocuments(data.documents.filter((doc: Document) => doc.status === 'processed'));
        }
      } catch (error) {
        console.error('Error fetching documents:', error);
      }
    };

    if (session?.user) {
      fetchDocuments();
    }
  }, [session]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversation history when document is selected
  useEffect(() => {
    if (selectedDocument && session?.user) {
      loadConversationHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDocument, session?.user]);

  const loadConversationHistory = async () => {
    if (!selectedDocument || !session?.user) return;

    try {
      const response = await fetch(
        `/api/chat?documentId=${selectedDocument._id}&userId=${session.user.id}`
      );
      const data = await response.json();
      if (data.success && data.history) {
        setMessages(data.history);
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedDocument || !session?.user || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setMessage('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: selectedDocument._id,
          userId: session.user.id,
          message: message,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your message. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">RAG Chat</h1>
        <p className="text-muted-foreground mt-2">
          Chat with your documents using AI-powered retrieval
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Document Selector Sidebar */}
        <div className="col-span-12 md:col-span-4 lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Documents</CardTitle>
              <CardDescription>Select a document to chat with</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {documents.length === 0 ? (
                <div className="flex flex-col items-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground text-center">
                    No processed documents yet
                  </p>
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    Upload and process documents first
                  </p>
                </div>
              ) : (
                documents.map((doc) => (
                  <button
                    key={doc._id}
                    onClick={() => setSelectedDocument(doc)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedDocument?._id === doc._id
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-muted border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.originalName}</p>
                        {doc.metadata && (
                          <div className="flex gap-2 mt-1">
                            {doc.metadata.pageCount && (
                              <Badge variant="secondary" className="text-xs">
                                {doc.metadata.pageCount} pages
                              </Badge>
                            )}
                            {doc.metadata.language && (
                              <Badge variant="outline" className="text-xs">
                                {doc.metadata.language}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Chat Area */}
        <div className="col-span-12 md:col-span-8 lg:col-span-9">
          <Card className="h-[calc(100vh-12rem)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                {selectedDocument ? selectedDocument.originalName : 'Chat'}
              </CardTitle>
              <CardDescription>
                Ask questions about your document and get AI-powered answers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedDocument ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    Select a document from the sidebar to start chatting
                  </p>
                </div>
              ) : (
                <>
                  {/* Messages Area */}
                  <div className="h-[500px] overflow-y-auto pr-4 space-y-4">
                    {messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground text-center mb-2">
                          Start a conversation about this document
                        </p>
                        <p className="text-sm text-muted-foreground text-center max-w-md">
                          Ask questions like &quot;What is this document about?&quot; or &quot;Summarize the main
                          points&quot;
                        </p>
                      </div>
                    ) : (
                      <>
                        {messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-lg p-4 ${
                                msg.role === 'user'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                              <p className="text-xs opacity-70 mt-2">
                                {new Date(msg.timestamp).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        ))}
                        {loading && (
                          <div className="flex justify-start">
                            <div className="bg-muted rounded-lg p-4">
                              <Loader2 className="h-5 w-5 animate-spin" />
                            </div>
                          </div>
                        )}
                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </div>

                  {/* Input Area */}
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Ask a question about this document..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="min-h-[60px]"
                      disabled={loading}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={loading || !message.trim()}
                      size="icon"
                      className="h-[60px] w-[60px]"
                    >
                      {loading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
