import { embedTexts } from "@/lib/documents/embed";
import { rerankedSearch } from "@/lib/retrieval/rerankedSearch";
import {
  DEFAULT_MAX_K,
  DEFAULT_RELEVANCE_THRESHOLD,
  selectByThreshold,
} from "@/lib/retrieval/selectByThreshold";

const CANDIDATE_POOL_SIZE = 20;

export function buildContextPrompt(
  chunks: { title: string; content: string }[],
  question: string,
): string {
  return `
<context>
${chunks
  .map(
    (chunk, idx) =>
      `
    <document index="${idx + 1}" title="${chunk.title}">
    ${chunk.content}
    </document>
    `,
  )
  .join("\n")}
</context>

<question>
${question}
</question>

Answer the <question> using only the information inside <context>.
    `;
}

type RelevantChunk = Awaited<ReturnType<typeof rerankedSearch>>[number];

export type CreateUserPromptResult =
  | { status: "no_documents" }
  | { status: "no_relevant_chunks" }
  | { status: "ok"; prompt: string; chunks: RelevantChunk[] };

// Merges the per-query ranked result lists into a single list, fairly, before
// deduping/thresholding. A naive concatenation (all of query 1's results, then all of
// query 2's) would let one query's chunks starve out another's once capped by
// DEFAULT_MAX_K if that one query alone already had >= DEFAULT_MAX_K relevant chunks —
// exactly the failure mode decomposition exists to avoid for comparison questions.
// Round-robin by rank instead: every query's #1 result before any query's #2 result,
// etc., so each sub-query gets a fair shot at surviving the later threshold + cap.
function interleaveByRank<T>(resultsPerQuery: T[][]): T[] {
  const merged: T[] = [];
  const maxLen = Math.max(0, ...resultsPerQuery.map((results) => results.length));
  for (let rank = 0; rank < maxLen; rank++) {
    for (const results of resultsPerQuery) {
      if (rank < results.length) merged.push(results[rank]);
    }
  }
  return merged;
}

/**
 * Builds the RAG prompt for one or more retrieval queries.
 *
 * `queries` has length 1 for a normal (non-comparison) question, or length 2+ when the
 * query planner (see lib/claude/prompts/queryPlanner.ts) decomposed a comparison question
 * into self-contained per-document sub-queries. All queries are batch-embedded in a
 * single Voyage call; `rerankedSearch` still runs once per query (it's query-scoped and
 * can't batch across queries), in parallel.
 *
 * `originalQuestion` is whichever question string the caller wants shown in the
 * `<question>` tag of the final prompt — for the chat route this is the planner's
 * resolved `selfContainedQuestion`, never the raw sub-queries and never the raw user
 * input verbatim (that's a display/persistence concern for the caller, not this
 * function's).
 */
export async function createUserPrompt(
  queries: string[],
  originalQuestion: string,
  userId: string,
  isAdmin: boolean,
): Promise<CreateUserPromptResult> {
  const embeddedQueries = await embedTexts(queries, "query");

  const resultsPerQuery = await Promise.all(
    queries.map((query, i) =>
      rerankedSearch(
        query,
        embeddedQueries[i],
        userId,
        isAdmin,
        CANDIDATE_POOL_SIZE,
        CANDIDATE_POOL_SIZE,
      ),
    ),
  );

  const anyResults = resultsPerQuery.some((results) => results.length > 0);
  if (!anyResults) return { status: "no_documents" };

  // Union across queries, deduped by chunk id (documentChunks.id is already a stable
  // per-chunk unique identifier — no need to compose documentId + chunkIndex).
  const seenChunkIds = new Set<string>();
  const unionedChunks: RelevantChunk[] = [];
  for (const chunk of interleaveByRank(resultsPerQuery)) {
    if (seenChunkIds.has(chunk.id)) continue;
    seenChunkIds.add(chunk.id);
    unionedChunks.push(chunk);
  }

  const relevantChunks = selectByThreshold(
    unionedChunks,
    DEFAULT_RELEVANCE_THRESHOLD,
    DEFAULT_MAX_K,
  );

  if (relevantChunks.length === 0) return { status: "no_relevant_chunks" };

  const prompt = buildContextPrompt(relevantChunks, originalQuestion);

  return { status: "ok", prompt, chunks: relevantChunks };
}
