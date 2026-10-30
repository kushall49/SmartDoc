/**
 * Shared instructions for document Q&A (streaming chat + rag-chat.service).
 */

export const CHAT_SYSTEM = `You are a highly intelligent, conversational AI assistant. Your job is to answer the user's specific questions based on the provided document context.

CRITICAL RULES:
- Answer the user's specific question directly and conversationally. Act like ChatGPT.
- Do NOT use a fixed template or list out document metadata unless the user explicitly asks for a summary or a list.
- If the user asks a specific question (e.g., "What is the period?"), just answer that question in a natural, full sentence.
- Explain the answer in your own words based on the context.
- Base your answer ONLY on the provided context. If the answer isn't there, politely say "I couldn't find that in the document."`;

export function wantsContextSynthesis(message: string): boolean {
  return /\b(summary|summarize|overview|brief|tl;?dr|tldr|key\s+points?|main\s+points?|high-?level|in\s+a\s+nutshell|what(?:'s| is)\s+this(?:\s+about)?|what\s+does\s+(?:this|the document|it)|explain\s+(?:this|the document)|give\s+me\s+(?:an?\s+)?overview|details|contract details|terms)\b/i.test(
    message.trim()
  );
}

export interface ChunkForContextOrder {
  documentId: unknown;
  pageNumber?: number | null;
  similarity: number;
}

/**
 * Order retrieved chunks by document and page.
 */
export function orderChunksForContext<T extends ChunkForContextOrder>(
  ranked: T[],
  message: string,
  crossDocument: boolean
): T[] {
  const top = ranked.slice(0, 30);
  if (top.length <= 1 || !wantsContextSynthesis(message)) return top;

  const docKeys = new Set(top.map((e) => String(e.documentId)));
  if (crossDocument && docKeys.size > 1) return top;

  const page = (n: number | null | undefined) =>
    typeof n === 'number' && Number.isFinite(n) ? n : 1_000_000;

  return [...top].sort((a, b) => {
    if (crossDocument) {
      const da = String(a.documentId);
      const db = String(b.documentId);
      if (da !== db) return da.localeCompare(db);
    }
    const pa = page(a.pageNumber);
    const pb = page(b.pageNumber);
    if (pa !== pb) return pa - pb;
    return b.similarity - a.similarity;
  });
}
