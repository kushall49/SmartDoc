# SmartDocIQ Architecture

A high-performance, single-path document intelligence platform with zero fallbacks and deterministic pipelines.

```
┌────────────────────────────────┐         ┌─────────────────────────────────┐
│     Frontend (React + Vite)    │  HTTP   │     Backend (Express + TS)      │
│  - React Router + TanStack Query│◄───────►│  - Port 4000                    │
│  - Tailwind CSS Glassmorphism  │   SSE   │  - Manual SSE Token Streaming   │
│  - Port 5173                   │         │  - Multer Disk Uploads (10 MB)  │
└────────────────────────────────┘         └───────────────┬─────────────────┘
                                                           │
                                ┌──────────────────────────┼─────────────────────────┐
                                │                          │                         │
                                ▼                          ▼                         ▼
                  ┌──────────────────────────┐ ┌───────────────────────┐ ┌──────────────────────┐
                  │ PostgreSQL 18 + pgvector │ │   BullMQ + Redis 7    │ │    Direct OpenAI     │
                  │ - Prisma ORM 5.22.0      │ │ - Single-mode queue   │ │ - gpt-4o (Chat/Vision│
                  │ - 1536-d HNSW Cosine     │ │ - Standalone Worker   │ │   & Compare)         │
                  │   vector_cosine_ops (<=>)│ │ - Exponential backoff │ │ - text-embedding-3-  │
                  └──────────────────────────┘ └───────────────────────┘ │   small (1536-d)     │
                                                                         └──────────────────────┘
```

---

## 1. Single-Path Stack Components

| Layer | Implementation | Defense / Rationale |
|---|---|---|
| **Frontend** | React 18, Vite 6, TypeScript, React Router 6, TanStack Query 5 | Sub-second client builds, no SSR hydration mismatch, true SSE reader with `AbortController`. |
| **Backend** | Express 4, TypeScript (`tsx`) | Full control over HTTP lifecycle, persistent connection streaming (`res.flushHeaders()`), sub-millisecond route dispatch. |
| **Database & Vector** | PostgreSQL 18 + `pgvector` v0.8.5 | Unified relational metadata and 1536-d vector embeddings in one transaction-safe database. Indexed via HNSW `vector_cosine_ops`. |
| **ORM** | Prisma 5.22.0 | Type-safe schema migrations with PostgreSQL extensions and raw SQL vector distance queries. |
| **Authentication** | JWT (`jsonwebtoken`) + `bcryptjs` (12 rounds) | Dual-transmission auth (Authorization header + httpOnly cookie) for maximum API and browser versatility. |
| **AI Provider** | Direct OpenAI (`gpt-4o`, `text-embedding-3-small`) | Zero intermediate router latency, high accuracy, exact per-request token and cost tracking. |
| **Queue & Worker** | BullMQ 5 + Redis 7 | Standalone Node.js worker process (`npm run worker`) for deterministic asynchronous document parsing. |
| **Storage** | Local disk (`./uploads/documents/:userId/`) | Strict 10 MB limit, path traversal sanitization, instant byte streaming. |

---

## 2. Ingestion & Retrieval Pipeline

1. **Upload**: User uploads PDF, DOCX, TXT, or image via `POST /api/documents/upload`.
2. **Persistence**: File written to `uploads/documents/:userId/` with cryptographic hash collision resistance. Record created in PostgreSQL (`status: 'pending'`).
3. **Queue**: BullMQ job dispatched to Redis on `document-processing` queue.
4. **Worker Execution**: Worker extracts raw text, generates overlapping 500-token chunks, creates 1536-d embeddings via OpenAI, and extracts key entities/anomalies via GPT-4o.
5. **Vector Search**: Search queries execute directly in PostgreSQL:
   ```sql
   SELECT id, document_id, chunk_text, (1 - (embedding <=> $1::vector))::float AS similarity
   FROM chunks
   WHERE user_id = $2::uuid
   ORDER BY embedding <=> $1::vector ASC
   LIMIT 15;
   ```
6. **RAG Streaming**: Express streams tokens over SSE (`text/event-stream`), emitting citation payloads and token chunks with client-disconnect abort signaling.
