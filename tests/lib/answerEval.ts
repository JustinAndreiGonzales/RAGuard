import { client, model } from "@/lib/claude/client";
import { systemPrompt } from "@/lib/claude/prompts/systemPrompt";

/**
 * Generates an answer for a single eval question using the exact same client/model as
 * production chat (see lib/claude/client.ts), non-streaming for simplicity in a batch script.
 */
export async function generateAnswer(prompt: string): Promise<string> {
  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: prompt }],
  });

  return response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

export type Verdict =
  | "correct"
  | "partially_correct"
  | "incorrect"
  | "correctly_abstained"
  | "unparseable";

export interface JudgeResult {
  verdict: Verdict;
  reasoning: string;
}

const UNANSWERABLE_SENTINEL = "(unanswerable — not covered by any document in the corpus)";

const JUDGE_SYSTEM_PROMPT = `
You are an evaluation judge for a RAG (retrieval-augmented generation) chat system. You will be given a question, an expected (reference) answer, and an actual answer produced by the system under test. Classify the actual answer into exactly one of four categories.

Special case — unanswerable questions: if the expected answer is exactly the literal string "${UNANSWERABLE_SENTINEL}", then no document in the corpus actually answers this question, and the correct system behavior is to say so rather than guess.
- If the actual answer correctly states it could not find the information, or otherwise declines to answer, classify as "correctly_abstained".
- If the actual answer instead confidently provides an answer (i.e. it hallucinated something not grounded in any real document), classify as "incorrect".

For every other question (where the expected answer is a real answer), classify as:
- "correct": the actual answer is factually correct and captures the key content of the expected answer.
- "partially_correct": the actual answer gets some but not all of the expected content right, or is correct but notably incomplete.
- "incorrect": the actual answer is wrong, contradicts the expected answer, or fails to answer when it should have (e.g. it incorrectly says it doesn't know).

Respond with ONLY a single JSON object and nothing else — no markdown code fences, no commentary before or after. The object must look exactly like this:
{"verdict": "correct", "reasoning": "one short sentence explaining the classification"}

"verdict" must be exactly one of: "correct", "partially_correct", "incorrect", "correctly_abstained".
`.trim();

function buildJudgeUserPrompt(question: string, expectedAnswer: string, actualAnswer: string): string {
  return `Question: ${question}

Expected answer: ${expectedAnswer}

Actual answer: ${actualAnswer}

Classify the actual answer as instructed.`;
}

const VALID_VERDICTS: ReadonlySet<string> = new Set([
  "correct",
  "partially_correct",
  "incorrect",
  "correctly_abstained",
]);

function parseJudgeResponse(raw: string): JudgeResult {
  // Judge is instructed to respond with raw JSON only, but strip markdown fences
  // defensively in case the model wraps it anyway.
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
      `[judgeAnswer] Failed to parse judge response as JSON: ${err instanceof Error ? err.message : String(err)}\nRaw response: ${raw}`,
    );
    return { verdict: "unparseable", reasoning: `Unparseable judge response: ${raw}` };
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("verdict" in parsed) ||
    typeof (parsed as { verdict: unknown }).verdict !== "string" ||
    !VALID_VERDICTS.has((parsed as { verdict: string }).verdict)
  ) {
    console.error(`[judgeAnswer] Judge response missing a valid "verdict" field. Raw response: ${raw}`);
    return { verdict: "unparseable", reasoning: `Judge response missing a valid verdict: ${raw}` };
  }

  const verdict = (parsed as { verdict: string }).verdict as Verdict;
  const reasoning =
    "reasoning" in parsed && typeof (parsed as { reasoning?: unknown }).reasoning === "string"
      ? (parsed as { reasoning: string }).reasoning
      : "";

  return { verdict, reasoning };
}

/**
 * Grades a generated answer against the golden-set expected answer using an LLM judge.
 * Uses the same client/model as production chat and generateAnswer above (per explicit
 * decision — not a stronger judge model).
 */
export async function judgeAnswer(
  question: string,
  expectedAnswer: string,
  actualAnswer: string,
): Promise<JudgeResult> {
  const response = await client.messages.create({
    model,
    max_tokens: 256,
    system: JUDGE_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildJudgeUserPrompt(question, expectedAnswer, actualAnswer) }],
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  return parseJudgeResponse(text);
}
