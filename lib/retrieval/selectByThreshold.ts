// First-pass calibration, not a rigorously tuned optimum: a baseline eval run (63
// confirmed-correct rank-1 hits vs. 30 unanswerable-question data points) found relevance
// scores cleanly separate the two groups with no overlap — correct hits ranged 0.660-0.969
// (mean 0.913), wrong/irrelevant chunks topped out at 0.645 (range 0.285-0.645, mean 0.466).
// 0.65 sat in that gap but caused a multi-chunk coverage regression: for comparison-style
// questions needing two chunks from different documents, one needed chunk sometimes scored
// just below it (~0.61), collapsing the retrieval window to a single chunk. Lowered to 0.60
// to test whether that recovers multi-chunk coverage; the known risk is a single wrong/
// irrelevant chunk that scored 0.645 (the top of that group's 0.285-0.645 range) for one of
// the unanswerable questions, which 0.60 would now admit. Revisit both constants as more
// eval data accumulates.
export const DEFAULT_RELEVANCE_THRESHOLD = 0.6;
export const DEFAULT_MAX_K = 8;

/**
 * Selects the chunks to actually send to the model from an already-ranked list.
 *
 * - Chunks with a defined `relevanceScore` below `threshold` are dropped.
 * - Chunks with an `undefined` `relevanceScore` are always kept — this happens when
 *   `rerankedSearch` falls back to plain vector-similarity order after a Voyage reranking
 *   failure, and there's no relevance signal to threshold against. Treating "no score" as
 *   "assume irrelevant" would turn a Voyage outage into a silently empty response instead of
 *   a degraded-but-still-useful one.
 * - Input order is preserved (no re-sorting): the caller has already ordered the list
 *   correctly, either by true relevance (reranked) or by vector similarity (fallback), and
 *   re-sorting by `relevanceScore` would scramble the fallback case where scores aren't
 *   comparable across items.
 * - The surviving list is capped at `maxK` (taken from the front, after filtering).
 */
export function selectByThreshold<T extends { relevanceScore?: number }>(
  rankedChunks: T[],
  threshold: number,
  maxK: number,
): T[] {
  const filtered = rankedChunks.filter(
    (chunk) => chunk.relevanceScore === undefined || chunk.relevanceScore >= threshold,
  );
  return filtered.slice(0, maxK);
}
