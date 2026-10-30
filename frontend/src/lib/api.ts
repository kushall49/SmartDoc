import { Citation } from '../types';

const API_BASE = '/api';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

export function getToken(): string | null {
  return localStorage.getItem('smartdoc_token');
}

export function setToken(token: string): void {
  localStorage.setItem('smartdoc_token', token);
}

export function removeToken(): void {
  localStorage.removeItem('smartdoc_token');
}

async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const contentType = response.headers.get('content-type') || '';
  let data: any = null;

  if (contentType.includes('application/json')) {
    data = await response.json();
  } else if (contentType.includes('text/')) {
    data = await response.text();
  } else {
    data = await response.blob();
  }

  if (!response.ok) {
    const errorMsg = data?.error || data?.message || `Request failed with status ${response.status}`;
    throw new ApiError(errorMsg, response.status, data);
  }

  return data as T;
}

export const api = {
  get: <T = any>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),

  post: <T = any>(endpoint: string, body?: any) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  delete: <T = any>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),

  upload: <T = any>(file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<T>('/documents/upload', {
      method: 'POST',
      body: formData,
    });
  },

  streamChat: (
    params: {
      message: string;
      documentId?: string;
      crossDocument?: boolean;
      chatId?: string;
      onSources?: (sources: Citation[]) => void;
      onToken?: (token: string) => void;
      onDone?: (fullText: string) => void;
      onError?: (err: Error) => void;
    },
    abortSignal?: AbortSignal
  ) => {
    const token = getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        message: params.message,
        documentId: params.documentId,
        crossDocument: params.crossDocument,
        chatId: params.chatId,
      }),
      signal: abortSignal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Stream failed with status ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('Response body stream not readable');

        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const jsonStr = trimmed.slice(6);
            try {
              const payload = JSON.parse(jsonStr);
              if (payload.type === 'sources' && params.onSources) {
                params.onSources(payload.sources);
              } else if (payload.type === 'token' && params.onToken) {
                params.onToken(payload.token);
              } else if (payload.type === 'done' && params.onDone) {
                params.onDone(payload.fullAnswer);
              } else if (payload.type === 'error' && params.onError) {
                params.onError(new Error(payload.error));
              }
            } catch (err) {
              // Ignore partial JSON chunks
            }
          }
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError' && params.onError) {
          params.onError(err);
        }
      });
  },
};

