# SmartDocIQ API Reference

Base URL: `http://localhost:4000/api`

All endpoints except `/auth/login`, `/auth/register`, `/health`, and `/documents/public/:id` require authentication via `Authorization: Bearer <token>` or `smartdoc_token` httpOnly cookie.

---

## Authentication (`/api/auth`)

- `POST /register`: Register a new user (`name`, `email`, `password`).
- `POST /login`: Authenticate with email and password; returns JWT token and user profile.
- `POST /logout`: Clears session cookie.
- `GET /me`: Returns current authenticated user record.

---

## Documents (`/api/documents`)

- `GET /`: List all documents belonging to the authenticated user.
- `POST /upload`: Upload file (multipart form field `file`; max 10 MB). Enqueues BullMQ worker job.
- `GET /:id`: Retrieve document metadata, extracted entities, summary, and anomalies.
- `DELETE /:id`: Deletes document from PostgreSQL and local disk.
- `GET /:id/status`: Poll document processing status (`pending`, `processing`, `ready`, `failed`).
- `POST /compare`: Semantic comparison between two documents (`documentId1`, `documentId2`).
- `POST /:id/vision`: OpenAI GPT-4o Vision analysis for image files (`ocr`, `diagram`, `table`, `full-analysis`).
- `GET /:id/export`: Export document content as `json`, `csv`, or `text`.
- `POST /:id/share`: Generate public share link (`/share/:id`).
- `GET /public/:id`: Public unauthenticated read-only endpoint for shared documents.

---

## Chat (`/api/chat`)

- `POST /stream`: Server-Sent Events (SSE) streaming endpoint.
  - Body: `{ message, documentId?, crossDocument?, chatId? }`
  - Emits:
    - `data: {"type": "sources", "sources": [...]}`
    - `data: {"type": "token", "token": "..."}`
    - `data: {"type": "done", "fullAnswer": "..."}`
- `POST /`: Non-streaming completion endpoint.
- `GET /history/:documentId`: Retrieve message history for document chat.

---

## Search (`/api/search`)

- `GET /?q=...&limit=15&type=...&from=...&to=...`:
  - 1536-d cosine vector similarity search powered by `pgvector`.
  - Filterable by document type, date range, and minimum similarity threshold.

---

## Cross-Document Intelligence (`/api/intelligence`)

- `POST /`: Multi-document synthesis across tenant repository. Discovers contradictions, recurring themes, and compliance flags.

---

## Audit & Analytics (`/api/audit`)

- `GET /`: Retrieve recent immutable audit trail entries.
- `GET /analytics`: Aggregated token usage counts (prompt, completion, total) and estimated USD costs.
- `GET /export?format=csv|json`: Export audit log history.

---

## System (`/api/health`)

- `GET /`: System health check (database connectivity, uptime, version).
