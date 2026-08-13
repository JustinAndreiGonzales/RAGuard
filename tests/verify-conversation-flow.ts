import { createUserPrompt } from "@/lib/claude/prompts/createUserPrompt";
import { planQuery } from "@/lib/claude/prompts/queryPlanner";

// Phase 2 verification: the query planner (lib/claude/prompts/queryPlanner.ts) resolves
// conversational follow-ups into self-contained questions, and decomposes genuine
// cross-document comparison questions into per-document sub-queries — both via a single
// Haiku call. Exercised directly against planQuery (no HTTP/chat layer), same
// direct-function-call pattern as tests/verify-team-sharing.ts.
//
// Phase 4 verification (Cases 4-7): the same planner call also classifies whether the
// message is a document question at all ("isDocumentQuestion"), so app/api/chat/route.ts
// can route greetings/small talk/meta questions to a canned response instead of running
// retrieval.
//
// Assumes the eval corpus is seeded (npm run db:seed:eval) for Case 3, which needs the
// "[EVAL] Employee Handbook v1 (2022)" / "v2 (2024)" documents and an admin user to own
// them (see db/seeds/seed.eval.ts). admin@example.com is seeded by db/seeds/seed.ts.
//
// Run: npx tsx tests/verify-conversation-flow.ts

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`  ok: ${message}`);
}

function includesAny(haystack: string, needles: string[]): boolean {
  const lower = haystack.toLowerCase();
  return needles.some((n) => lower.includes(n.toLowerCase()));
}

async function main() {
  console.log("Case 1: follow-up question with 2-turn history resolves conversational reference");
  const followUpPlan = await planQuery(
    [
      { role: "user", content: "What was Aurora Robotics' revenue in 2021?" },
      {
        role: "assistant",
        content: "Aurora Robotics reported revenue of $42 million in fiscal year 2021.",
      },
    ],
    "how about 2022?",
  );
  console.log(`  planner output: ${JSON.stringify(followUpPlan)}`);
  assert(
    includesAny(followUpPlan.selfContainedQuestion, ["2022"]),
    `selfContainedQuestion mentions 2022, got: "${followUpPlan.selfContainedQuestion}"`,
  );
  assert(
    includesAny(followUpPlan.selfContainedQuestion, ["revenue", "aurora robotics", "aurora"]),
    `selfContainedQuestion mentions the entity/metric from history (revenue / Aurora Robotics), got: "${followUpPlan.selfContainedQuestion}"`,
  );
  assert(followUpPlan.subQueries === null, `subQueries is null, got: ${JSON.stringify(followUpPlan.subQueries)}`);

  console.log(
    "\nCase 2: single-turn comparison question (no history) decomposes into 2 sub-queries",
  );
  const comparisonQuestion =
    "How did the remote work policy change between employee handbook v1 and v2?";
  const comparisonPlan = await planQuery([], comparisonQuestion);
  console.log(`  planner output: ${JSON.stringify(comparisonPlan)}`);
  assert(
    Array.isArray(comparisonPlan.subQueries) && comparisonPlan.subQueries.length === 2,
    `subQueries is an array of length 2, got: ${JSON.stringify(comparisonPlan.subQueries)}`,
  );

  console.log(
    "\nCase 3: end-to-end createUserPrompt with the decomposed queries surfaces chunks from BOTH target documents",
  );
  const { db } = await import("@/db");
  const { users } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const [admin] = await db.select().from(users).where(eq(users.email, "admin@example.com"));
  assert(admin, "admin@example.com exists (run npm run db:seed)");

  const subQueries = comparisonPlan.subQueries!;
  const result = await createUserPrompt(subQueries, comparisonPlan.selfContainedQuestion, admin.id, true);
  console.log(`  createUserPrompt status: ${result.status}`);
  assert(result.status === "ok", `createUserPrompt returns status "ok", got: "${result.status}"`);

  if (result.status === "ok") {
    const titles = result.chunks.map((c) => c.title);
    console.log(`  chunk titles in result: ${JSON.stringify(titles)}`);
    assert(
      titles.some((t) => t.includes("Employee Handbook v1")),
      `at least one chunk from "Employee Handbook v1" is present, got titles: ${JSON.stringify(titles)}`,
    );
    assert(
      titles.some((t) => t.includes("Employee Handbook v2")),
      `at least one chunk from "Employee Handbook v2" is present, got titles: ${JSON.stringify(titles)}`,
    );
  }

  console.log(
    "\nCase 4: greeting with no history classifies as isDocumentQuestion === false",
  );
  const greetingPlan = await planQuery([], "hi there!");
  console.log(`  planner output: ${JSON.stringify(greetingPlan)}`);
  assert(
    greetingPlan.isDocumentQuestion === false,
    `isDocumentQuestion is false for a greeting, got: ${JSON.stringify(greetingPlan)}`,
  );

  console.log(
    "\nCase 5: real document question with no history classifies as isDocumentQuestion === true",
  );
  const docQuestionPlan = await planQuery(
    [],
    "what was Aurora Robotics' revenue in 2022?",
  );
  console.log(`  planner output: ${JSON.stringify(docQuestionPlan)}`);
  assert(
    docQuestionPlan.isDocumentQuestion === true,
    `isDocumentQuestion is true for a real document question, got: ${JSON.stringify(docQuestionPlan)}`,
  );

  console.log(
    "\nCase 6 (borderline): meta question about the assistant classifies as isDocumentQuestion === false",
  );
  const metaPlan = await planQuery([], "what can you do?");
  console.log(`  planner output: ${JSON.stringify(metaPlan)}`);
  assert(
    metaPlan.isDocumentQuestion === false,
    `isDocumentQuestion is false for a meta question about the assistant, got: ${JSON.stringify(metaPlan)}`,
  );

  console.log(
    "\nCase 7 (borderline): vaguely-phrased but genuine document question classifies as isDocumentQuestion === true",
  );
  const vaguePlan = await planQuery([], "what does it say about vacation days?");
  console.log(`  planner output: ${JSON.stringify(vaguePlan)}`);
  assert(
    vaguePlan.isDocumentQuestion === true,
    `isDocumentQuestion is true for a vaguely-phrased document question, got: ${JSON.stringify(vaguePlan)}`,
  );

  console.log("\nAll conversation-flow (query planner) checks passed.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
