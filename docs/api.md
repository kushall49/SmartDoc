# API Notes

Quick reference for the API routes.

## Auth

All dashboard routes require a valid NextAuth session. Pass the session cookie — endpoints return 401 if missing.

## Documents

**Upload**
```
POST /api/documents/upload
Content-Type: multipart/form-data

file: <the file>
```
Returns the document ID. Processing happens async — poll `/api/documents/:id/status` to check.

**Process (trigger manually)**
```
POST /api/documents/process
{ "documentId": "..." }
```
Useful if the worker missed the job or you want to reprocess.

**List**
```
GET /api/documents
```
Returns all docs for the logged-in user.

**Delete**
```
DELETE /api/documents/:id
```
Deletes doc, all its embeddings, and the S3 file.

## Search

```
GET /api/search?q=your+query&limit=10
```
Embeds the query, runs cosine similarity against all your docs, returns ranked results with scores.

## Chat

**Streaming (recommended)**
```
POST /api/chat/stream
{ "chatId": "...", "message": "..." }
```
Returns SSE stream. Each event is a text chunk.

**Non-streaming**
```
POST /api/chat
{ "chatId": "...", "message": "..." }
```
Waits for full response — slower but simpler to work with.

## Analytics

```
GET /api/analytics
```
Returns token usage, cost, and request counts grouped by AI provider.

## Health

```
GET /api/health
```
Returns app uptime + DB + Redis connection status. Good for monitoring.
