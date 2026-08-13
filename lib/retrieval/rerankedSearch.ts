import { rerankChunks } from "@/lib/documents/rerank";
import { searchAccessibleChunks } from "@/lib/retrieval/searchAccessibleChunks";

export async function rerankedSearch(
  query: string,
  queryEmbedding: number[],
  userId: string,
  isAdmin: boolean,
  candidatePoolSize: number,
  finalCount: number,
  { fallbackOnError = true }: { fallbackOnError?: boolean } = {},
) {
  const candidates = await searchAccessibleChunks(
    queryEmbedding,
    userId,
    isAdmin,
    candidatePoolSize,
  );
  if (candidates.length === 0) return candidates;

  try {
    const ranked = await rerankChunks(
      query,
      candidates.map((c) => c.content),
      finalCount,
    );
    return ranked.map((r) => candidates[r.index]);
  } catch (err) {
    if (!fallbackOnError) throw err;
    console.error("Rerank failed, falling back to vector-ranked order:", err);
    return candidates.slice(0, finalCount);
  }
}
