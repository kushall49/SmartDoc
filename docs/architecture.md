# Architecture Notes

Quick notes on how things are wired together — mostly for my own reference.

## How document processing works

When a file gets uploaded:
1. Saved to S3 (or local `/uploads` in dev)
2. A BullMQ job gets queued
3. Worker picks it up → runs OCR if needed → splits text into chunks
4. Each chunk gets embedded via `text-embedding-3-large`
5. Embeddings stored in MongoDB alongside the doc metadata
6. AI analysis runs (summary, entities, classification) — model router picks the provider
7. Results written back to the Document record

The whole thing is async so the upload API responds in ~100ms even if processing takes 30s.

## Model routing logic

`model-router.service.ts` decides which AI provider to use:

- Short docs / simple tasks → GPT-4o-mini (cheapest, fast)
- Long docs (>10k tokens) → Claude 3.5 Sonnet (200K context)
- Vision tasks → GPT-4o (best multimodal)
- Everything else → GPT-4o

Cost per request gets logged to `UsageLog` so the analytics dashboard can show breakdowns.

## RAG chat pipeline

1. User sends a message
2. Message gets embedded
3. Cosine similarity search against all stored chunk embeddings for that doc
4. Top-K chunks retrieved and stuffed into the prompt
5. LLM call with context + history
6. Response streamed back via SSE

## Why embeddings in MongoDB and not a vector DB

Honestly — simplicity. MongoDB Atlas has vector search built in, and for the scale this runs at (hundreds of docs, not millions) it's more than fast enough. If this ever needed to scale to millions of documents I'd move to Pinecone or Weaviate.

## On Vercel vs local

Locally: BullMQ worker runs as a separate process (`npm run worker`).

On Vercel: No persistent processes, so document processing happens inline in the API route using `after()` (Next.js 15 feature for post-response work). Less reliable for very long jobs but works for most cases.
