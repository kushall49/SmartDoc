# SmartDoc

An AI-powered document platform I built to solve a real problem — too many PDFs, no easy way to search or extract anything useful from them.

Upload a document, get back a summary, extracted entities, and a chat interface where you can ask questions about it. Built this over a few months while learning about RAG pipelines and vector search.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js) ![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript&logoColor=white) ![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?logo=mongodb&logoColor=white) ![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-412991?logo=openai&logoColor=white)

---

## What it does

- Upload PDFs, images, or DOCX files
- OCR for scanned documents (Tesseract.js, Textract for heavier stuff)
- AI summarization + entity extraction (names, dates, amounts)
- Semantic search across all your docs using vector embeddings
- RAG chat — ask questions, get answers grounded in your actual documents
- Analytics dashboard showing token usage and cost per provider

The interesting part is the model router — it automatically picks between GPT-4o-mini, GPT-4o, and Claude 3.5 Sonnet based on document complexity. Short invoices go to mini, long contracts go to Claude (200K context window). Saves a lot on API costs.

---

## Stack

- **Frontend/Backend** — Next.js 15 App Router (unified, no separate Express)
- **Database** — MongoDB + Mongoose
- **Queue** — BullMQ + Redis for async document processing
- **AI** — OpenAI (GPT-4o, text-embedding-3-large), Anthropic Claude 3.5 Sonnet
- **Storage** — AWS S3 in prod, local filesystem fallback for dev
- **Auth** — NextAuth.js
- **Testing** — Jest + Playwright

---

## Getting started

You'll need Node 18+, MongoDB, and Redis running locally (or Atlas + Upstash).

```bash
git clone https://github.com/kushall49/SmartDoc.git
cd SmartDoc
npm install
cp .env.example .env
# fill in your API keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Or with Docker (spins up everything including Mongo + Redis):

```bash
cp .env.example .env
docker compose up --build
```

---

## Project structure

```
src/
├── app/
│   ├── api/          # all route handlers
│   ├── dashboard/    # protected pages
│   └── page.tsx      # landing page
├── components/       # UI components
├── services/         # core logic (RAG, embeddings, OCR, model router etc.)
├── models/           # mongoose schemas
├── lib/              # db, auth, config, logger
└── worker.ts         # BullMQ worker
```

Docs on specific parts are in [`/docs`](./docs/).

---

## Running tests

```bash
npm test                # unit tests
npm run test:coverage   # with coverage
npm run e2e             # playwright (needs dev server running)
```

---

## API routes

| Method | Route | What it does |
|--------|-------|--------------|
| POST | `/api/documents/upload` | upload a file |
| POST | `/api/documents/process` | trigger AI processing |
| GET | `/api/documents` | list your documents |
| DELETE | `/api/documents/:id` | delete doc + embeddings |
| GET | `/api/search?q=` | semantic search |
| POST | `/api/chat/stream` | streaming RAG chat (SSE) |
| GET | `/api/analytics` | usage stats + cost |
| GET | `/api/health` | health check |

---

## Notes

- No separate vector DB — embeddings live in MongoDB alongside metadata. Works fine for the scale this is at, would swap to Pinecone or Weaviate if it needed to scale further.
- The BullMQ worker runs as a separate process. On Vercel (serverless) it falls back to inline processing since you can't run a persistent worker.
- Rate limiting is on every route — sliding window via Redis.

---

MIT License — feel free to use or learn from it.
