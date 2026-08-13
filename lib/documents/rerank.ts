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
  const res = await fetch("https://api.voyageai.com/v1/rerank", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY!}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      documents,
      model: "rerank-2.5",
      top_k: topK,
    }),
  });

  if (!res.ok)
    throw new Error(`Voyage rerank API error: ${res.status} ${await res.text()}`);

  const data: RerankResponse = await res.json();
  return data.data
    .map((r) => ({ index: r.index, relevanceScore: r.relevance_score }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}
