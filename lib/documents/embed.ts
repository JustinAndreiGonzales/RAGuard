interface EmbeddingResponse {
  object: string;
  data: { object: string; index: number; embedding: number[] }[];
  model: string;
  usage: { total_tokens: number };
}

const MAX_ITEMS_PER_BATCH = 1000;
// Voyage's tokenizer averages ~5 chars/token; cap well under the real
// 320K token/request limit to leave headroom for that estimate being off.
const MAX_ESTIMATED_TOKENS_PER_BATCH = 300_000;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 5);
}

function batchTexts(texts: string[]): string[][] {
  const batches: string[][] = [];
  let currentBatch: string[] = [];
  let currentTokenEstimate = 0;

  for (const text of texts) {
    const tokenEstimate = estimateTokens(text);
    const wouldExceedItems = currentBatch.length + 1 > MAX_ITEMS_PER_BATCH;
    const wouldExceedTokens =
      currentTokenEstimate + tokenEstimate > MAX_ESTIMATED_TOKENS_PER_BATCH;

    if (currentBatch.length > 0 && (wouldExceedItems || wouldExceedTokens)) {
      batches.push(currentBatch);
      currentBatch = [];
      currentTokenEstimate = 0;
    }

    currentBatch.push(text);
    currentTokenEstimate += tokenEstimate;
  }

  if (currentBatch.length > 0) batches.push(currentBatch);

  return batches;
}

export async function embedTexts(
  texts: string[],
  inputType: "document" | "query",
): Promise<number[][]> {
  const batches = batchTexts(texts);
  const results = await Promise.all(
    batches.map((batch) => embed(batch, inputType)),
  );
  return results.flat();
}

async function embed(
  texts: string[],
  inputType: "document" | "query",
): Promise<number[][]> {
  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY!}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: texts,
      model: "voyage-4-lite",
      input_type: inputType,
      output_dimension: 1024,
    }),
  });

  if (!res.ok)
    throw new Error(`Voyage API error: ${res.status} ${await res.text()}`);

  const data: EmbeddingResponse = await res.json();
  return data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}
