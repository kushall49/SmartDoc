# 📄 SmartDocIQ — Intelligent Document Processing & Conversational RAG

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.0+-646cff.svg)](https://vitejs.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18_%2B_pgvector-336791.svg)](https://github.com/pgvector/pgvector)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o_%2B_text--embedding--3--small-412991.svg)](https://openai.com/)

SmartDocIQ is a production-grade, interview-ready **Enterprise Document Intelligence & Conversational RAG Platform**. It allows users to upload complex documents (PDFs, DOCX, images, text), automatically extracts text and structured metadata, indexes content using **1536-dimensional native PostgreSQL `pgvector` embeddings**, and enables fluid, streaming conversational chat with verified source citations.

---

## 🏛️ Monorepo Architecture

SmartDocIQ is decoupled into a clean,  monorepo separating API services from frontend client concerns:


```
SmartDoc/
├── backend/                  # Express REST API & Ingestion Engine
│   ├── prisma/               # Prisma Schema (PostgreSQL 18 + pgvector)
│   ├── scripts/              # Seed scripts & automated verification suite
│   ├── src/
│   │   ├── lib/              # Database client, OpenAI SDK, Logger, Prompts
│   │   ├── server/           # Express server, JWT auth middleware, routes
│   │   │   ├── middleware/   # JWT auth, Multer upload security
│   │   │   └── routes/       # Auth, Documents, Chat (SSE), Audit, Analytics
│   │   └── services/         # Vector search, OCR, Embedding, Processing
│   └── uploads/              # Local tenant-isolated storage
├── frontend/                 # React 18 + Vite Single Page Application
│   ├── src/
│   │   ├── components/       # Layout, Navigation, Citations, UI Badges
│   │   ├── pages/            # 14 distinct capability views (Chat, Upload, Compare...)
│   │   ├── lib/              # Fetch API client with SSE streaming reader
│   │   └── types/            # Strict TypeScript interfaces
├── docs/                     # Architectural documentation & API specifications
│   ├── architecture.md       # Full design decisions & technical blueprint
│   └── api.md                # REST & SSE endpoint contracts
├── docker-compose.yml        # PostgreSQL 18 with pgvector service definition
├── .gitignore                # Excludes secrets, uploads, IDEs & tooling (.agents, .cursor, .github)
└── README.md
```
<img width="1496" height="1600" alt="image" src="https://github.com/user-attachments/assets/dfecdcb2-dc2f-4106-b93e-3abfd6144f62" />


---

## ✨ Key Features & Capabilities

### 1. Conversational RAG Assistant (Single & Cross-Document)
* **ChatGPT-Style Natural Interaction**: Answers specific questions conversationally in complete sentences without robotic templates or raw text dumping.
* **Single-Document Deep Dive**: Targeted queries restricted to a single selected contract, bank statement, or report.
* **Cross-Document Repository Search**: Real-time multi-document reasoning that compares clauses, balances, and timelines across multiple files simultaneously.
* **Server-Sent Events (SSE) Streaming**: Low-latency token-by-token streaming response with verified citation pills (document name, page number, similarity score).

### 2. High-Speed Synchronous Ingestion Pipeline (< 500ms)
* Automatic text extraction for **PDFs** (`pdf-parse`), **Word Docs** (`mammoth`), **Images** (`tesseract.js`), and raw text files.
* Intelligent heuristic classifier that identifies document types (**Contract**, **Bank Statement**, **Invoice**, **Report**) and extracts key fields (parties, account numbers, dates, balances, payment terms).
* Automatic sentence-boundary and table-line chunking with 80-token overlap.

### 3. Native PostgreSQL `pgvector` Cosine Retrieval
* Replaced legacy in-memory loops with native PostgreSQL vector queries:
  ```sql
  SELECT id, document_id, chunk_text, (1 - (embedding <=> $1::vector)) AS similarity
  FROM chunks
  WHERE user_id = $2::uuid
  ORDER BY embedding <=> $1::vector ASC
  LIMIT 15;
  ```
* High-performance HNSW index on `vector(1536)` column for sub-millisecond retrieval.

### 4. Semantic Document Comparison
* Side-by-side structured comparison between any two uploaded documents.
* Automatically analyzes shared clauses, conflicting provisions, payment terms, and unique liabilities.

### 5. Multi-Tenant Isolation & Security
* Multi-tenant data segregation enforced at the database level (`userId` foreign keys on documents, chunks, and chat sessions).
* Local disk storage strictly partitioned by user (`./uploads/documents/:userId/:file`).
* Strict file validation: 10 MB per-file limit, MIME type whitelist.

### 6. Audit & Intelligence Analytics
* Tracks processing durations, token consumption, and estimated OpenAI API costs.
* Security audit trail logging all document uploads, views, queries, and deletions.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, TanStack Query |
| **Backend API** | Express.js, TypeScript, Node.js 18+, Multer |
| **Database** | PostgreSQL 18 with `pgvector` extension (`vector(1536)`) |
| **ORM** | Prisma 5 with native PostgreSQL raw vector queries |
| **AI & LLM** | OpenAI direct integration (`gpt-4o`, `text-embedding-3-small`) |
| **Background Processing** | BullMQ + Redis (optional async queue) with synchronous fallback |
| **Authentication** | Stateless JWT (Bearer header + httpOnly cookie support), Bcrypt (12 rounds) |

---

## 🚀 Quickstart & Local Setup

### 1. Prerequisites
* **Node.js**: v18.0.0 or higher
* **PostgreSQL**: v16+ with `pgvector` enabled (or run via Docker)

### 2. Database Setup (Docker)
Start PostgreSQL 18 with `pgvector`:
```bash
docker-compose up -d postgres
```

### 3. Environment Configuration
Create `.env` in the root directory (or copy from `.env.example`):
```env
# Database (PostgreSQL 18 with pgvector)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/smartdociq?schema=public"

# OpenAI API Key
OPENAI_API_KEY="sk-proj-your-key-here"
OPENAI_MODEL="gpt-4o"
OPENAI_FAST_MODEL="gpt-4o-mini"

# JWT Authentication
JWT_SECRET="your-secure-jwt-secret-key-at-least-32-characters"

# Server Ports
PORT=4000
VITE_API_URL="http://localhost:4000/api"
```

### 4. Install Dependencies & Migrate Database
```bash
# Install backend dependencies
cd backend
npm install
npx prisma db push

# Install frontend dependencies
cd ../frontend
npm install
```

### 5. Run the Application
Open two terminal windows:

**Terminal 1 (Backend Server):**
```bash
cd backend
npx tsx src/server/index.ts
# Express API running on http://localhost:4000
```

**Terminal 2 (Frontend Client):**
```bash
cd frontend
npx vite --host
# Vite UI running on http://localhost:5173
```

---

## 🧪 Verification & Automated Testing

SmartDocIQ includes an end-to-end automated verification script covering all architectural requirements:

```bash
cd backend
npx tsx scripts/verify-all-steps.ts
```

This verifies:
1. PostgreSQL 18 `pgvector` extension and table creation.
2. Vector cosine similarity queries via native `<=>` operator.
3. OpenAI embedding generation and GPT-4o completions.
4. Tenant-isolated local file storage on disk.
5. Ingestion pipeline (OCR, chunking, and metadata parsing).

6. Express REST API endpoints and SSE streaming headers.
7. JWT authentication and password hashing.
8. Frontend Vite compilation and component availability.

---

## 📄 License
MIT License. Created for technical architecture demonstration and production deployment.
