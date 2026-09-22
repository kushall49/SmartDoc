<p align="center">
  <img src="public/smartdoc-logo.svg" width="64" alt="SmartDoc Logo" />
</p>

<h1 align="center">SmartDoc</h1>
<p align="center"><strong>AI-Powered Document Intelligence Platform</strong></p>

<p align="center">
  Upload documents → extract text via OCR → analyze with GPT-4o &amp; Claude → search semantically → chat with RAG
</p>

<p align="center">
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-15-black?logo=next.js" alt="Next.js"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript&logoColor=white" alt="TypeScript"></a>
  <a href="https://www.mongodb.com/"><img src="https://img.shields.io/badge/MongoDB-7-47A248?logo=mongodb&logoColor=white" alt="MongoDB"></a>
  <a href="https://openai.com/"><img src="https://img.shields.io/badge/OpenAI-GPT--4o-412991?logo=openai&logoColor=white" alt="OpenAI"></a>
  <a href="https://www.anthropic.com/"><img src="https://img.shields.io/badge/Anthropic-Claude_3.5-D97706" alt="Anthropic"></a>
  <a href="https://aws.amazon.com/s3/"><img src="https://img.shields.io/badge/AWS-S3-FF9900?logo=amazon-aws&logoColor=white" alt="AWS S3"></a>
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
</p>

---

## What It Does

Businesses drown in unstructured documents — contracts, invoices, scanned forms, reports. SmartDoc turns them into structured, searchable, conversational knowledge.

You upload a PDF or image. SmartDoc extracts the text (OCR for scans), identifies entities (names, dates, amounts), classifies the document type, flags anomalies, and stores vector embeddings for semantic search. You can then run natural language searches across all your documents, or open a chat interface and ask questions — answered using Retrieval-Augmented Generation grounded in the actual document content.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client (Next.js 15)                         │
│          Upload  ·  Dashboard  ·  Search  ·  RAG Chat               │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTP / SSE (streaming chat)
┌──────────────────────────────▼──────────────────────────────────────┐
│                     Next.js API Routes                              │
│   /upload  ·  /process  ·  /search  ·  /chat  ·  /analytics        │
│                                                                     │
│  ┌─────────────────┐    ┌──────────────────────────────────────┐   │
│  │  BullMQ Queue   │    │         Smart Model Router           │   │
│  │  (Redis-backed) │    │  Complexity → GPT-4o-mini / GPT-4o   │   │
│  │  Async + retry  │    │            / Claude 3.5 Sonnet       │   │
│  └────────┬────────┘    └──────────────────┬───────────────────┘   │
└───────────┼──────────────────────────────── ┼──────────────────────┘
            │                                 │
            ▼                                 ▼
┌───────────────────────┐       ┌─────────────────────────────────┐
│   Document Pipeline   │       │        AI Services              │
│                       │       │                                 │
│  1. OCR (Tesseract /  │       │  • Summarization                │
│     AWS Textract)     │──────▶│  • Entity extraction            │
│  2. Text chunking     │       │  • Classification               │
│  3. Embedding (OpenAI │       │  • Anomaly / fraud detection    │
│     text-embedding-   │       │  • RAG chat (vector + LLM)      │
│     3-large)          │       └────────────────┬────────────────┘
│  4. Vector storage    │                        │
└───────────┬───────────┘                        │
            │                                    │
            ▼                                    ▼
┌───────────────────────────────────────────────────────────────────┐
│                        Storage Layer                              │
│   MongoDB (metadata · embeddings · usage logs)   AWS S3 (files)  │
└───────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision | Why |
|---|---|
| **Multi-provider AI routing** | Simple tasks → GPT-4o-mini (8× cheaper). Long contracts → Claude 3.5 Sonnet (200K context). The router picks automatically based on document complexity and task type. |
| **BullMQ over synchronous processing** | Document pipelines can take 5–30s. Queueing decouples upload from processing, gives automatic retry with exponential backoff, and keeps API response times under 200ms. |
| **Vector embeddings in MongoDB** | Keeps the embedding store collocated with document metadata — no separate vector DB to operate. Cosine similarity search via Atlas Vector Search or a pure JS fallback in dev. |
| **Next.js App Router for everything** | Unified codebase for frontend + API. Server Components reduce client JS. Route Handlers replace a separate Express server. |
| **SSE streaming for chat** | RAG chat responses stream token-by-token over Server-Sent Events, giving users instant feedback without a WebSocket infrastructure requirement. |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15 (App Router), React 18, TypeScript, Tailwind CSS, ShadCN UI |
| **Backend** | Next.js Route Handlers, Mongoose / MongoDB, BullMQ, Redis |
| **AI / ML** | OpenAI GPT-4o + text-embedding-3-large, Anthropic Claude 3.5 Sonnet, Tesseract.js OCR |
| **Storage** | AWS S3 (production), local filesystem fallback (development) |
| **Auth** | NextAuth.js (credentials + session management) |
| **DevOps** | Docker Compose (app + worker + mongo + redis), Vercel (serverless deployment) |
| **Testing** | Jest + React Testing Library (unit), Playwright (E2E) |

---

## Features

- **Document Upload** — PDF, PNG, JPG, DOCX; up to 10 MB; validated server-side
- **OCR** — Tesseract.js for client-side processing; AWS Textract available via env flag
- **AI Analysis** — summarization, entity extraction (names / dates / amounts), document classification, anomaly detection
- **Smart Model Router** — selects GPT-4o-mini / GPT-4o / Claude based on document length and task type; tracks cost per request
- **Semantic Search** — natural language queries against vector embeddings; returns ranked results with relevance scores
- **RAG Chat** — streaming chat interface grounded in retrieved document chunks; maintains conversation history
- **Analytics Dashboard** — real-time usage logs, per-provider cost breakdown, token consumption
- **Audit Log** — append-only log of all AI operations per document
- **Rate Limiting** — sliding window rate limit on all API routes

---

## Local Setup

### Prerequisites

- Node.js ≥ 18.17
- MongoDB (local or Atlas)
- Redis (local or Upstash)
- OpenAI API key
- Anthropic API key (optional but enables full routing)
- AWS credentials (optional; local storage fallback works without them)

### Quickstart

```bash
# 1. Clone
git clone https://github.com/kushall49/SmartDoc.git
cd SmartDoc

# 2. Install
npm install

# 3. Configure
cp .env.example .env
# Edit .env and fill in your keys

# 4. Start
npm run dev
# → http://localhost:3000
```

### Docker (full stack in one command)

```bash
cp .env.example .env   # fill in API keys
docker compose up --build
```

Starts: Next.js app, BullMQ worker, MongoDB, Redis — all with health checks.

---

## Running Tests

```bash
# Unit + integration tests
npm test

# With coverage report
npm run test:coverage

# End-to-end (Playwright) — requires the dev server to be running
npm run e2e

# All at once
npm run test:all
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/documents/upload` | Upload a document (multipart/form-data) |
| `POST` | `/api/documents/process` | Trigger AI processing for a document |
| `GET` | `/api/documents` | List all documents for the authenticated user |
| `DELETE` | `/api/documents/:id` | Delete a document and its embeddings |
| `GET` | `/api/search?q=` | Semantic search across all documents |
| `POST` | `/api/chat` | Send a chat message (returns full response) |
| `POST` | `/api/chat/stream` | Send a chat message (SSE streaming) |
| `GET` | `/api/analytics` | AI usage statistics and cost breakdown |
| `GET` | `/api/audit/:documentId` | Audit log for a specific document |
| `GET` | `/api/health` | Health check (uptime, DB, Redis status) |

---

## Project Structure

```
src/
├── app/
│   ├── api/              # Route Handlers (upload, process, search, chat, analytics…)
│   ├── dashboard/        # Protected pages (documents, search, chat, analytics)
│   └── page.tsx          # Public landing page
├── components/           # React components (FileUpload, ChatInterface, SearchBar…)
├── services/             # Business logic
│   ├── model-router.service.ts      # Smart AI provider selection
│   ├── ai-enhanced.service.ts       # Multi-provider AI calls
│   ├── rag.service.ts               # Retrieval-Augmented Generation
│   ├── embedding.service.ts         # Vector embedding generation
│   ├── vector-search.service.ts     # Cosine similarity search
│   ├── document-processor.service.ts
│   ├── ocr.service.ts
│   └── s3.service.ts
├── models/               # Mongoose schemas (Document, User, Chat, Embedding, UsageLog)
├── lib/                  # Config, auth, DB connection, rate limiter, logger
├── types/                # TypeScript interfaces
└── worker.ts             # BullMQ worker process entry point
```

---

## License

MIT — free to fork, learn from, or build on.

---

<p align="center">Built by <a href="https://github.com/kushall49">Kushal</a></p>
