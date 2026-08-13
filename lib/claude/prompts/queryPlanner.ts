import { client, model } from "@/lib/claude/client";
import { queryPlannerSystemPrompt } from "@/lib/claude/prompts/queryPlannerSystemPrompt";

// How many recent messages (across both roles) to feed the planner as conversation
// history, most-recent-first bounded to this count. "4" = up to 2 user/assistant
// turn-pairs — enough to resolve most immediate follow-ups without unbounded context
// growth on long conversations. Consumed by app/api/chat/route.ts when fetching history.
export const HISTORY_WINDOW_SIZE = 4;

export interface QueryPlanHistoryTurn {
  role: "user" | "assistant";
  content: string;
}

export interface QueryPlan {
  selfContainedQuestion: string;
  subQueries: string[] | null;
  isDocumentQuestion: boolean;
}

function buildPlannerUserPrompt(
  history: QueryPlanHistoryTurn[],
  latestUserInput: string,
): string {
  const historyBlock =
    history.length === 0
      ? "(no prior conversation history — this is the first message in the conversation)"
      : history
          .map((turn) => `${turn.role === "user" ? "User" : "Assistant"}: ${turn.content}`)
          .join("\n\n");

  return `Conversation history:\n${historyBlock}\n\nLatest user message:\n${latestUserInput}\n\nProduce the JSON plan as instructed.`;
}

// Parses the planner's response defensively, mirroring the rigor of
// tests/lib/answerEval.ts's parseJudgeResponse — but since this runs in the production
// request path (not a batch eval script), a genuinely malformed response throws instead
// of silently degrading to a fallback value; the caller (app/api/chat/route.ts) decides
// how to handle that failure.
function parsePlannerResponse(raw: string): QueryPlan {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(
      `[planQuery] Failed to parse planner response as JSON: ${err instanceof Error ? err.message : String(err)}\nRaw response: ${raw}`,
    );
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("selfContainedQuestion" in parsed) ||
    typeof (parsed as { selfContainedQuestion: unknown }).selfContainedQuestion !== "string" ||
    (parsed as { selfContainedQuestion: string }).selfContainedQuestion.trim() === ""
  ) {
    throw new Error(
      `[planQuery] Planner response missing a valid non-empty "selfContainedQuestion" string field. Raw response: ${raw}`,
    );
  }

  const subQueriesRaw = (parsed as { subQueries?: unknown }).subQueries;
  let subQueries: string[] | null;
  if (subQueriesRaw === null || subQueriesRaw === undefined) {
    subQueries = null;
  } else if (
    Array.isArray(subQueriesRaw) &&
    subQueriesRaw.length >= 2 &&
    subQueriesRaw.every((q) => typeof q === "string" && q.trim() !== "")
  ) {
    subQueries = subQueriesRaw;
  } else {
    throw new Error(
      `[planQuery] Planner response has an invalid "subQueries" field (must be null or an array of 2+ non-empty strings). Raw response: ${raw}`,
    );
  }

  if (
    !("isDocumentQuestion" in parsed) ||
    typeof (parsed as { isDocumentQuestion: unknown }).isDocumentQuestion !== "boolean"
  ) {
    throw new Error(
      `[planQuery] Planner response missing a valid "isDocumentQuestion" boolean field. Raw response: ${raw}`,
    );
  }

  return {
    selfContainedQuestion: (parsed as { selfContainedQuestion: string }).selfContainedQuestion,
    subQueries,
    isDocumentQuestion: (parsed as { isDocumentQuestion: boolean }).isDocumentQuestion,
  };
}

/**
 * Runs on every chat message. Resolves conversational references in the latest user
 * message into a self-contained question (using `history`, oldest-first), and — in the
 * same call — decomposes genuine cross-document comparison questions into multiple
 * self-contained per-document sub-queries. Always calls the planner even when `history`
 * is empty: a first-turn comparison question ("compare handbook v1 vs v2") still needs
 * decomposition, so an empty history is not a reason to skip planning.
 */
export async function planQuery(
  history: QueryPlanHistoryTurn[],
  latestUserInput: string,
): Promise<QueryPlan> {
  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    system: queryPlannerSystemPrompt,
    messages: [{ role: "user", content: buildPlannerUserPrompt(history, latestUserInput) }],
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  return parsePlannerResponse(text);
}
