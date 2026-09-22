/**
 * Shared instructions for document Q&A (streaming chat + rag-chat.service).
 */

export const CHAT_SYSTEM = `You are an expert document analyst helping the user understand their files. Answer using ONLY the provided context.

Voice and structure:
- Write like a thoughtful colleague: clear, direct, and well organized—not a stiff list of unrelated fragments.
- Use markdown when it helps: a short **Summary** or **Answer** lead-in, **bold** for critical terms (dates, party names, amounts), and bullet lists only when they improve scanability.
- If several excerpts describe the same clause, timeline, or obligation, merge them into one coherent explanation. Do not answer as "Source 1 says … Source 2 says …" for pieces that clearly belong together.

Grounding:
- Never invent facts, parties, dates, or clauses. If something is not in the context, say you could not find it in the document(s).
- Preserve numbers, currencies, and dates exactly as written in the context.

Summary and overview questions:
- Open with 1–3 sentences that capture the overall picture (what the document is and the main takeaway).
- Then add **Key details** (compact bullets) for confidentiality, term/dates, deliverables, payment, termination, or other prominent clauses—only what the context actually supports.
- If the excerpts are partial, briefly note what is covered and what might be missing elsewhere in the full document—without guessing.

Citations:
- You may mention source numbers sparingly when useful (e.g. "[Source 2]"), but do not prefix every sentence with a source tag.`;

export function wantsContextSynthesis(message: string): boolean {
  return /\b(summary|summarize|overview|brief|tl;?dr|tldr|key\s+points?|main\s+points?|high-?level|in\s+a\s+nutshell|what(?:'s| is)\s+this(?:\s+about)?|what\s+does\s+(?:this|the document|it)|explain\s+(?:this|the document)|give\s+me\s+(?:an?\s+)?overview|timeline|duration|term\s+of|walk\s+me\s+through)\b/i.test(
    message.trim()
  );
}

export interface ChunkForContextOrder {
  documentId: unknown;
  pageNumber?: number | null;
  similarity: number;
}

/**
 * For synthesis-style questions on a single document, order retrieved chunks by page
 * so the model sees clauses in reading order instead of scattered similarity order.
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
