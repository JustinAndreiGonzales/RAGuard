import { rerankChunks } from "@/lib/documents/rerank";
import { reciprocalRankFusion } from "@/lib/retrieval/reciprocalRankFusion";
import { searchAccessibleChunks } from "@/lib/retrieval/searchAccessibleChunks";
import { searchSparseChunks } from "@/lib/retrieval/searchSparseChunks";

export async function rerankedSearch(
  query: string,
  queryEmbedding: number[],
  userId: string,
  isAdmin: boolean,
  candidatePoolSize: number,
  finalCount: number,
  { fallbackOnError = true }: { fallbackOnError?: boolean } = {},
) {
  const [denseCandidates, sparseCandidates] = await Promise.all([
    searchAccessibleChunks(queryEmbedding, userId, isAdmin, candidatePoolSize),
    searchSparseChunks(query, userId, isAdmin, candidatePoolSize),
  ]);
  const candidates = reciprocalRankFusion<
    (typeof denseCandidates)[number] | (typeof sparseCandidates)[number]
  >([denseCandidates, sparseCandidates]).slice(0, candidatePoolSize);
  if (candidates.length === 0)
    return candidates.map((c) => ({ ...c, relevanceScore: undefined as number | undefined }));

  try {
    const ranked = await rerankChunks(
      query,
      candidates.map((c) => c.content),
      finalCount,
    );
    return ranked.map((r) => ({ ...candidates[r.index], relevanceScore: r.relevanceScore }));
  } catch (err) {
    if (!fallbackOnError) throw err;
    console.error("Rerank failed, falling back to vector-ranked order:", err);
    return candidates
      .slice(0, finalCount)
      .map((c) => ({ ...c, relevanceScore: undefined as number | undefined }));
  }
}
