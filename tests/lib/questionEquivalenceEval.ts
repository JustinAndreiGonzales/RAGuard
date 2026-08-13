import { client, model } from "@/lib/claude/client";

/**
 * Judge for a DIFFERENT purpose than tests/lib/answerEval.ts's judgeAnswer: this grades
 * whether the query planner's ACTUAL resolved `selfContainedQuestion` (see
 * lib/claude/prompts/queryPlanner.ts) is semantically equivalent to a human-authored
 * REFERENCE resolved question for the same conversation turn — i.e. "do these two
 * questions ask for the same information, even if worded differently?" Mirrors
 * answerEval.ts's client/model choice, strict-JSON-output instruction, and defensive
 * parsing (markdown-fence stripping, explicit "unparseable" state on malformed output —
 * never silently miscounted), but uses a narrower binary verdict scale since this is a
 * narrower question than answer grading (no partial-correctness or abstention concepts
 * apply to condensation).
 */
export type EquivalenceVerdict = "equivalent" | "not_equivalent" | "unparseable";

export interface EquivalenceResult {
  verdict: EquivalenceVerdict;
  reasoning: string;
}

const EQUIVALENCE_JUDGE_SYSTEM_PROMPT = `
You are an evaluation judge for a RAG (retrieval-augmented generation) chat system's query planner. The planner resolves a user's latest message — which may be a conversational follow-up (e.g. using pronouns, or implicitly referring to something discussed earlier) — into a self-contained question that no longer depends on conversation history.

You will be given two versions of a resolved question for the same conversation turn:
- "Actual": produced automatically by the planner.
- "Reference": a human-authored gold version of what the resolved question should be.

Judge whether the two ask for the same underlying information — i.e. whether answering one would answer the other. Wording, phrasing, and sentence structure may differ freely; what matters is whether the same entities, time periods, documents, and the same underlying question are being asked about.

Classify as:
- "equivalent": the two questions ask for the same information. Minor differences in phrasing, word order, or level of politeness do not matter.
- "not_equivalent": the two questions ask for different information — e.g. a different entity, a different year/version, a missing or added constraint, or the actual question still contains an unresolved reference (a pronoun or implicit reference that the reference question has already resolved).

Respond with ONLY a single JSON object and nothing else — no markdown code fences, no commentary before or after. The object must look exactly like this:
{"verdict": "equivalent", "reasoning": "one short sentence explaining the classification"}

"verdict" must be exactly one of: "equivalent", "not_equivalent".
`.trim();

function buildEquivalenceUserPrompt(actualQuestion: string, referenceQuestion: string): string {
  return `Actual: ${actualQuestion}

Reference: ${referenceQuestion}

Classify as instructed.`;
}

const VALID_EQUIVALENCE_VERDICTS: ReadonlySet<string> = new Set(["equivalent", "not_equivalent"]);

function parseEquivalenceResponse(raw: string): EquivalenceResult {
  // Judge is instructed to respond with raw JSON only, but strip markdown fences
  // defensively in case the model wraps it anyway (mirrors answerEval.ts's parseJudgeResponse).
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error(
      `[judgeQuestionEquivalence] Failed to parse judge response as JSON: ${err instanceof Error ? err.message : String(err)}\nRaw response: ${raw}`,
    );
    return { verdict: "unparseable", reasoning: `Unparseable judge response: ${raw}` };
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("verdict" in parsed) ||
    typeof (parsed as { verdict: unknown }).verdict !== "string" ||
    !VALID_EQUIVALENCE_VERDICTS.has((parsed as { verdict: string }).verdict)
  ) {
    console.error(
      `[judgeQuestionEquivalence] Judge response missing a valid "verdict" field. Raw response: ${raw}`,
    );
    return { verdict: "unparseable", reasoning: `Judge response missing a valid verdict: ${raw}` };
  }

  const verdict = (parsed as { verdict: string }).verdict as EquivalenceVerdict;
  const reasoning =
    "reasoning" in parsed && typeof (parsed as { reasoning?: unknown }).reasoning === "string"
      ? (parsed as { reasoning: string }).reasoning
      : "";

  return { verdict, reasoning };
}

/**
 * Grades whether the planner's actual resolved question is semantically equivalent to a
 * human-authored reference resolved question, using an LLM judge. Uses the same
 * client/model as production chat and tests/lib/answerEval.ts (per the same explicit
 * decision recorded there — not a stronger judge model).
 */
export async function judgeQuestionEquivalence(
  actualQuestion: string,
  referenceQuestion: string,
): Promise<EquivalenceResult> {
  const response = await client.messages.create({
    model,
    max_tokens: 256,
    system: EQUIVALENCE_JUDGE_SYSTEM_PROMPT,
    messages: [
      { role: "user", content: buildEquivalenceUserPrompt(actualQuestion, referenceQuestion) },
    ],
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  return parseEquivalenceResponse(text);
}
