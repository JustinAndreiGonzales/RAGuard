import { voyageFetch } from "./voyageClient";

interface RerankResponse {
  object: string;
  data: { index: number; relevance_score: number }[];
  model: string;
  usage: { total_tokens: number };
}

export async function rerankChunks(
  query: string,
  documents: string[],
  topK: number,
): Promise<{ index: number; relevanceScore: number }[]> {
  const data = await voyageFetch<RerankResponse>(
    "/rerank",
    {
      query,
      documents,
      model: "rerank-2.5",
      top_k: topK,
    },
    "Voyage rerank API error",
  );

  return data.data
    .map((r) => ({ index: r.index, relevanceScore: r.relevance_score }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}
