import { db } from "@/db";
import { users } from "@/db/schema";
import { model } from "@/lib/claude/client";
import { buildContextPrompt, createUserPrompt } from "@/lib/claude/prompts/createUserPrompt";
import { planQuery, type QueryPlanHistoryTurn } from "@/lib/claude/prompts/queryPlanner";
import { embedTexts } from "@/lib/documents/embed";
import { rerankedSearch } from "@/lib/retrieval/rerankedSearch";
import { searchAccessibleChunks } from "@/lib/retrieval/searchAccessibleChunks";
import {
  DEFAULT_MAX_K,
  DEFAULT_RELEVANCE_THRESHOLD,
  selectByThreshold,
} from "@/lib/retrieval/selectByThreshold";
import { eq } from "drizzle-orm";
import ExcelJS from "exceljs";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { generateAnswer, judgeAnswer, type Verdict } from "@/tests/lib/answerEval";
import {
  judgeQuestionEquivalence,
  type EquivalenceVerdict,
} from "@/tests/lib/questionEquivalenceEval";

interface ExpectedChunk {
  documentTitle: string;
  chunkIndex: number;
}

interface GoldenEntry {
  id: string;
  question: string;
  expectedChunks: ExpectedChunk[];
  category: string;
  expectedAnswer: string;
}

interface RankedResult {
  title: string;
  chunkIndex: number;
  content: string;
  relevanceScore?: number;
}

interface Metrics {
  n: number;
  recall: Record<string, number>;
  mrr: number;
  ndcg10: number;
}

interface WindowMetrics {
  multiChunkCoverage: number | null;
  unanswerableSuppressionRate: number | null;
  avgChunkCount: number;
}

interface PerQuestionRecord {
  id: string;
  category: string;
  question: string;
  rank: number | null;
  ndcg10: number;
  matchedTitle: string | null;
  matchedChunkIndex: number | null;
  top1RelevanceScore: number | null;
  isTop1Match: boolean;
  windowSize: number;
  windowRelevanceScores: (number | null)[];
  multiChunkCovered?: boolean;
  // Only populated when run with --answers.
  generatedAnswer?: string;
  verdict?: Verdict;
  verdictReasoning?: string;
}

interface AnswerQualityMetrics {
  n: number;
  passRate: number;
  counts: Record<Verdict, number>;
}

// --- Multi-turn conversation eval (--conversations) types ---
// See tests/fixtures/eval-conversations.json for the fixture schema this mirrors.
interface ConversationTurnFixture {
  userInput: string;
  referenceSelfContainedQuestion: string;
  expectedChunks: ExpectedChunk[];
}

interface ConversationFixture {
  id: string;
  description: string;
  turns: ConversationTurnFixture[];
}

interface ConversationTurnRecord {
  conversationId: string;
  turnIndex: number;
  userInput: string;
  plannerSelfContainedQuestion: string;
  referenceSelfContainedQuestion: string;
  subQueries: string[] | null;
  equivalenceVerdict: EquivalenceVerdict;
  equivalenceReasoning: string;
  retrievedChunkTitles: string[];
  retrievalRecallSatisfied: boolean;
}

interface ConversationMetrics {
  n: number;
  condensationAccuracyRate: number;
  retrievalRecallRate: number;
}

interface ConversationsEvalResult {
  overall: ConversationMetrics;
  byConversation: Record<string, ConversationMetrics>;
  turns: ConversationTurnRecord[];
}

// --- Decomposition coverage (multi-chunk golden-set questions) types ---
interface DecompositionCoverageRecord {
  id: string;
  question: string;
  subQueriesTriggered: boolean;
  subQueries: string[] | null;
  expectedDocumentTitles: string[];
  retrievedDocumentTitles: string[];
  allExpectedDocumentsRetrieved: boolean;
}

interface DecompositionCoverageResult {
  n: number;
  triggeredCount: number;
  allDocsRetrievedCount: number;
  records: DecompositionCoverageRecord[];
}

const TOP_K = 20;
const RECALL_KS = [1, 3, 5, 10];
const NDCG_K = 10;
const UNANSWERABLE_CATEGORY = "unanswerable";

const LOG_HEADERS = [
  "Date",
  "N",
  "TopK",
  "Recall@1",
  "Recall@3",
  "Recall@5",
  "Recall@10",
  "MRR",
  "nDCG@10",
  "Disambiguation Recall@1",
  "Trap Recall@1",
  "Misses (no match)",
  "Report File",
  "Notes",
  "Reranked",
  "Multi-chunk Coverage",
  "Unanswerable Suppression Rate",
  "Avg Chunk Count",
  "Answer Quality Pass Rate",
  "Conversation Condensation Accuracy",
  "Conversation Retrieval Recall",
  "Decomposition Coverage (Triggered)",
  "Decomposition Coverage (All Docs)",
];

function getNoteArg(): string {
  const args = process.argv.slice(2);
  const idx = args.findIndex((a) => a === "--note" || a === "-n");
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : "";
}

function getRerankFlag(): boolean {
  return process.argv.slice(2).includes("--rerank");
}

function getAnswersFlag(): boolean {
  return process.argv.slice(2).includes("--answers");
}

function getConversationsFlag(): boolean {
  return process.argv.slice(2).includes("--conversations");
}

function round(v: number): number {
  return Number(v.toFixed(3));
}

async function appendToExcelLog(rowValues: (string | number)[], logPath: string) {
  const workbook = new ExcelJS.Workbook();
  let sheet: ExcelJS.Worksheet | undefined;

  if (existsSync(logPath)) {
    await workbook.xlsx.readFile(logPath);
    sheet = workbook.getWorksheet("Log");
  }
  if (!sheet) sheet = workbook.addWorksheet("Log");

  // Always sync row 1 to the current headers — keeps older files' header row in
  // sync when a column (like "Reranked") gets added after the file already exists.
  sheet.getRow(1).values = LOG_HEADERS;
  sheet.getRow(1).font = { bold: true };
  LOG_HEADERS.forEach((_, i) => {
    sheet!.getColumn(i + 1).width = 20;
  });

  sheet.addRow(rowValues);
  await workbook.xlsx.writeFile(logPath);
}

// Reusable recall-checking primitive: does `result` match any of `expectedChunks`? Shared
// by the single-turn golden-set loop, the --conversations turn-level recall check, and the
// multi-chunk decomposition coverage check below — all three ultimately compare a
// {documentTitle, chunkIndex} pair against a retrieved {title, chunkIndex} pair.
function chunkMatchesAny(
  expectedChunks: ExpectedChunk[],
  result: { title: string; chunkIndex: number },
): boolean {
  return expectedChunks.some(
    (ec) => ec.documentTitle === result.title && ec.chunkIndex === result.chunkIndex,
  );
}

function isMatch(entry: GoldenEntry, result: RankedResult): boolean {
  return chunkMatchesAny(entry.expectedChunks, result);
}

function findRank(entry: GoldenEntry, results: RankedResult[]): number | null {
  const idx = results.findIndex((r) => isMatch(entry, r));
  return idx === -1 ? null : idx + 1;
}

function recallAtK(ranks: (number | null)[], k: number): number {
  const hits = ranks.filter((r) => r !== null && r <= k).length;
  return hits / ranks.length;
}

function mrr(ranks: (number | null)[]): number {
  const total = ranks.reduce((sum: number, r) => sum + (r ? 1 / r : 0), 0);
  return total / ranks.length;
}

function ndcgAtK(entry: GoldenEntry, results: RankedResult[], k: number): number {
  const relevance: number[] = results.slice(0, k).map((r) => (isMatch(entry, r) ? 1 : 0));
  const dcg = relevance.reduce((sum, rel, i) => sum + rel / Math.log2(i + 2), 0);
  const idealHits = Math.min(entry.expectedChunks.length, k);
  const idcg = Array.from({ length: idealHits }, (_, i) => 1 / Math.log2(i + 2)).reduce(
    (a, b) => a + b,
    0,
  );
  return idcg === 0 ? 0 : dcg / idcg;
}

// Every expected chunk must be found somewhere in `results` — reusable for both the
// single-turn golden-set "multi-chunk" category window and the --conversations /
// decomposition-coverage checks (which pass createUserPrompt's retrieved chunks instead
// of a searchAccessibleChunks window).
function allExpectedChunksCovered(
  expectedChunks: ExpectedChunk[],
  results: { title: string; chunkIndex: number }[],
): boolean {
  return expectedChunks.every((ec) => results.some((r) => chunkMatchesAny([ec], r)));
}

function multiChunkCoverage(entry: GoldenEntry, window: RankedResult[]): boolean {
  return allExpectedChunksCovered(entry.expectedChunks, window);
}

function computeWindowMetrics(
  perQuestion: { category: string; windowSize: number; multiChunkCovered?: boolean }[],
): WindowMetrics {
  const multiChunkRows = perQuestion.filter((q) => q.category === "multi-chunk");
  const unanswerableRows = perQuestion.filter((q) => q.category === UNANSWERABLE_CATEGORY);

  return {
    multiChunkCoverage:
      multiChunkRows.length === 0
        ? null
        : multiChunkRows.filter((q) => q.multiChunkCovered).length / multiChunkRows.length,
    unanswerableSuppressionRate:
      unanswerableRows.length === 0
        ? null
        : unanswerableRows.filter((q) => q.windowSize === 0).length / unanswerableRows.length,
    avgChunkCount:
      perQuestion.reduce((sum, q) => sum + q.windowSize, 0) / perQuestion.length,
  };
}

function printWindowMetrics(m: WindowMetrics) {
  console.log(
    `  Multi-chunk Coverage: ${m.multiChunkCoverage === null ? "n/a" : (m.multiChunkCoverage * 100).toFixed(1) + "%"}`,
  );
  console.log(
    `  Unanswerable Suppression Rate: ${m.unanswerableSuppressionRate === null ? "n/a" : (m.unanswerableSuppressionRate * 100).toFixed(1) + "%"}`,
  );
  console.log(`  Avg Chunk Count: ${m.avgChunkCount.toFixed(2)}`);
}

function computeMetrics(ranks: (number | null)[], ndcgValues: number[]): Metrics {
  return {
    n: ranks.length,
    recall: Object.fromEntries(RECALL_KS.map((k) => [`@${k}`, recallAtK(ranks, k)])),
    mrr: mrr(ranks),
    ndcg10: ndcgValues.reduce((s, v) => s + v, 0) / ndcgValues.length,
  };
}

function printMetrics(m: Metrics) {
  console.log(`  n=${m.n}`);
  for (const [k, v] of Object.entries(m.recall)) {
    console.log(`  Recall${k}: ${(v * 100).toFixed(1)}%`);
  }
  console.log(`  MRR: ${m.mrr.toFixed(3)}`);
  console.log(`  nDCG@${NDCG_K}: ${m.ndcg10.toFixed(3)}`);
}

// "Pass" for aggregate purposes = correct + correctly_abstained. partially_correct,
// incorrect, and unparseable all count against the pass rate.
function computeAnswerQualityMetrics(rows: PerQuestionRecord[]): AnswerQualityMetrics {
  const verdicts = rows.map((r) => r.verdict).filter((v): v is Verdict => v !== undefined);
  const counts: Record<Verdict, number> = {
    correct: 0,
    partially_correct: 0,
    incorrect: 0,
    correctly_abstained: 0,
    unparseable: 0,
  };
  for (const v of verdicts) counts[v]++;
  const passCount = counts.correct + counts.correctly_abstained;
  return {
    n: verdicts.length,
    passRate: verdicts.length === 0 ? 0 : passCount / verdicts.length,
    counts,
  };
}

function printAnswerQualityMetrics(m: AnswerQualityMetrics) {
  console.log(`  n=${m.n}`);
  console.log(`  Pass rate (correct + correctly_abstained): ${(m.passRate * 100).toFixed(1)}%`);
  console.log(
    `  correct=${m.counts.correct} correctly_abstained=${m.counts.correctly_abstained} ` +
      `partially_correct=${m.counts.partially_correct} incorrect=${m.counts.incorrect} ` +
      `unparseable=${m.counts.unparseable}`,
  );
}

function computeConversationMetrics(turns: ConversationTurnRecord[]): ConversationMetrics {
  const n = turns.length;
  const equivalentCount = turns.filter((t) => t.equivalenceVerdict === "equivalent").length;
  const recallSatisfiedCount = turns.filter((t) => t.retrievalRecallSatisfied).length;
  return {
    n,
    condensationAccuracyRate: n === 0 ? 0 : equivalentCount / n,
    retrievalRecallRate: n === 0 ? 0 : recallSatisfiedCount / n,
  };
}

function printConversationMetrics(label: string, m: ConversationMetrics) {
  console.log(
    `  ${label}: n=${m.n}  condensation accuracy=${(m.condensationAccuracyRate * 100).toFixed(1)}%  ` +
      `retrieval recall=${(m.retrievalRecallRate * 100).toFixed(1)}%`,
  );
}

// Placeholder assistant turn appended to conversation history between planQuery calls.
// KNOWN SIMPLIFICATION: the real chat route (app/api/chat/route.ts) always has a genuine
// assistant reply in history, and in principle the planner could lean on that reply's
// content to resolve a follow-up (not just the user's own wording). Generating a real
// answer here (via generateAnswer + buildContextPrompt) would more faithfully reproduce
// production, but at the cost of a third Claude call per turn for a script whose purpose
// is condensation/retrieval quality, not answer quality (that's --answers' job). The
// fixtures in tests/fixtures/eval-conversations.json are deliberately written so every
// follow-up's referent is resolvable from the user's own turns alone (pronouns/entities
// named earlier by the user, comparison years/versions named earlier by the user) — this
// placeholder is sufficient to exercise HISTORY_WINDOW_SIZE turn-over-turn without
// pretending to be a real answer.
const PLACEHOLDER_ASSISTANT_REPLY = "Here is the information you requested.";

async function runConversationsEval(adminId: string): Promise<ConversationsEvalResult> {
  const conversationsPath = path.join(process.cwd(), "tests/fixtures/eval-conversations.json");
  const conversations: ConversationFixture[] = JSON.parse(readFileSync(conversationsPath, "utf-8"));

  const allTurns: ConversationTurnRecord[] = [];
  const byConversation: Record<string, ConversationMetrics> = {};

  for (const conversation of conversations) {
    const history: QueryPlanHistoryTurn[] = [];
    const conversationTurns: ConversationTurnRecord[] = [];

    for (let turnIndex = 0; turnIndex < conversation.turns.length; turnIndex++) {
      const turn = conversation.turns[turnIndex];

      const plan = await planQuery(history, turn.userInput);
      const equivalence = await judgeQuestionEquivalence(
        plan.selfContainedQuestion,
        turn.referenceSelfContainedQuestion,
      );

      const queries = plan.subQueries ?? [plan.selfContainedQuestion];
      const promptResult = await createUserPrompt(queries, plan.selfContainedQuestion, adminId, true);
      const retrievedChunks = promptResult.status === "ok" ? promptResult.chunks : [];
      const retrievalRecallSatisfied = allExpectedChunksCovered(turn.expectedChunks, retrievedChunks);

      conversationTurns.push({
        conversationId: conversation.id,
        turnIndex,
        userInput: turn.userInput,
        plannerSelfContainedQuestion: plan.selfContainedQuestion,
        referenceSelfContainedQuestion: turn.referenceSelfContainedQuestion,
        subQueries: plan.subQueries,
        equivalenceVerdict: equivalence.verdict,
        equivalenceReasoning: equivalence.reasoning,
        retrievedChunkTitles: retrievedChunks.map((c) => c.title),
        retrievalRecallSatisfied,
      });

      history.push({ role: "user", content: turn.userInput });
      history.push({ role: "assistant", content: PLACEHOLDER_ASSISTANT_REPLY });
    }

    byConversation[conversation.id] = computeConversationMetrics(conversationTurns);
    allTurns.push(...conversationTurns);
  }

  return {
    overall: computeConversationMetrics(allTurns),
    byConversation,
    turns: allTurns,
  };
}

// Item 4 from the plan: for the 5 "multi-chunk" golden-set questions (q061-q065), confirm
// planQuery([], question) triggers decomposition (subQueries comes back as an array) and
// that per-sub-query retrieval actually surfaces chunks from all of the question's
// distinct expected documents. Reported as its own summary (not folded into the general
// retrieval metrics) since this is the concrete q065-regression-fix confirmation the whole
// phase 3 plan is building toward.
async function runDecompositionCoverage(
  goldenSet: GoldenEntry[],
  adminId: string,
): Promise<DecompositionCoverageResult> {
  const multiChunkEntries = goldenSet.filter((g) => g.category === "multi-chunk");
  const records: DecompositionCoverageRecord[] = [];

  for (const entry of multiChunkEntries) {
    const plan = await planQuery([], entry.question);
    const subQueriesTriggered = Array.isArray(plan.subQueries);
    const expectedDocumentTitles = [...new Set(entry.expectedChunks.map((ec) => ec.documentTitle))];

    let retrievedDocumentTitles: string[] = [];
    let allExpectedDocumentsRetrieved = false;

    if (subQueriesTriggered) {
      const queries = plan.subQueries!;
      const promptResult = await createUserPrompt(queries, plan.selfContainedQuestion, adminId, true);
      const retrievedChunks = promptResult.status === "ok" ? promptResult.chunks : [];
      retrievedDocumentTitles = [...new Set(retrievedChunks.map((c) => c.title))];
      allExpectedDocumentsRetrieved = expectedDocumentTitles.every((title) =>
        retrievedDocumentTitles.includes(title),
      );
    }

    records.push({
      id: entry.id,
      question: entry.question,
      subQueriesTriggered,
      subQueries: plan.subQueries,
      expectedDocumentTitles,
      retrievedDocumentTitles,
      allExpectedDocumentsRetrieved,
    });
  }

  return {
    n: records.length,
    triggeredCount: records.filter((r) => r.subQueriesTriggered).length,
    allDocsRetrievedCount: records.filter((r) => r.allExpectedDocumentsRetrieved).length,
    records,
  };
}

function printDecompositionCoverage(result: DecompositionCoverageResult) {
  console.log(
    `Decomposition coverage: ${result.triggeredCount}/${result.n} multi-chunk questions triggered ` +
      `sub-queries, ${result.allDocsRetrievedCount}/${result.n} retrieved all expected documents`,
  );
  for (const r of result.records) {
    console.log(
      `  ${r.id}: triggered=${r.subQueriesTriggered ? "yes" : "no"} ` +
        `allDocsRetrieved=${r.allExpectedDocumentsRetrieved ? "yes" : "no"} ` +
        `expectedDocs=${JSON.stringify(r.expectedDocumentTitles)} ` +
        `retrievedDocs=${JSON.stringify(r.retrievedDocumentTitles)}`,
    );
  }
}

async function main() {
  const goldenPath = path.join(process.cwd(), "tests/fixtures/eval-golden-set.json");
  const goldenSet: GoldenEntry[] = JSON.parse(readFileSync(goldenPath, "utf-8"));

  const [admin] = await db.select().from(users).where(eq(users.email, "admin@example.com"));
  if (!admin) throw new Error("admin@example.com not found (run db:seed first)");

  console.log(
    `Embedding ${goldenSet.length} golden questions in a single Voyage API call (input_type: "query")...`,
  );
  const embeddings = await embedTexts(
    goldenSet.map((g) => g.question),
    "query",
  );
  console.log("Embedding call complete — no further Voyage calls needed for the rest of this run.\n");

  const useRerank = getRerankFlag();
  if (useRerank) {
    console.log(
      `Reranking enabled (rerank-2.5 over top ${TOP_K}) — ${goldenSet.length} sequential rerank calls ` +
        `(one per question; rerank can't batch across questions like embeddings can).\n`,
    );
  }

  const useAnswers = getAnswersFlag();
  if (useAnswers) {
    console.log(
      `Answer-quality phase enabled — ${goldenSet.length} answer-generation calls plus ` +
        `${goldenSet.length} judge calls (both on ${model}), on top of retrieval.\n`,
    );
  }

  // --conversations runs as a separate pass (see below, after the single-turn golden-set
  // loop): multi-turn conversation fixtures + the multi-chunk decomposition-coverage check
  // both need planQuery, which the single-turn loop above doesn't call.
  const useConversations = getConversationsFlag();
  if (useConversations) {
    console.log(
      `Conversation eval phase enabled — replays tests/fixtures/eval-conversations.json ` +
        `turn-by-turn through planQuery, plus a decomposition-coverage check over the 5 ` +
        `multi-chunk golden-set questions.\n`,
    );
  }

  const perQuestion: PerQuestionRecord[] = [];
  for (let i = 0; i < goldenSet.length; i++) {
    const entry = goldenSet[i];

    let ranked: RankedResult[];
    if (useRerank) {
      const results = await rerankedSearch(
        entry.question,
        embeddings[i],
        admin.id,
        true,
        TOP_K,
        TOP_K,
        { fallbackOnError: false },
      );
      ranked = results.map((r) => ({
        title: r.title,
        chunkIndex: r.chunkIndex,
        content: r.content,
        relevanceScore: r.relevanceScore,
      }));
    } else {
      const results = await searchAccessibleChunks(embeddings[i], admin.id, true, TOP_K);
      ranked = results.map((r) => ({ title: r.title, chunkIndex: r.chunkIndex, content: r.content }));
    }
    const rank = findRank(entry, ranked);
    const ndcg10 = ndcgAtK(entry, ranked, NDCG_K);
    const matched = rank ? ranked[rank - 1] : undefined;

    // "Today's production window" — production selects a variable-length window via
    // selectByThreshold (relevance-score cutoff + max-k cap), not a fixed slice. Computed
    // from the same full-depth list already fetched above, so this costs no extra API calls.
    const window = selectByThreshold(ranked, DEFAULT_RELEVANCE_THRESHOLD, DEFAULT_MAX_K);
    const multiChunkCovered =
      entry.category === "multi-chunk" ? multiChunkCoverage(entry, window) : undefined;

    const record: PerQuestionRecord = {
      id: entry.id,
      category: entry.category,
      question: entry.question,
      rank,
      ndcg10,
      matchedTitle: matched?.title ?? null,
      matchedChunkIndex: matched?.chunkIndex ?? null,
      top1RelevanceScore: ranked[0]?.relevanceScore ?? null,
      isTop1Match: rank === 1,
      windowSize: window.length,
      windowRelevanceScores: window.map((r) => r.relevanceScore ?? null),
      multiChunkCovered,
    };

    // Answer-generation + judging phase — opt-in via --answers since it's 2 extra Claude
    // calls per question (generation + judging) on top of retrieval.
    if (useAnswers) {
      const chunksForPrompt = window.map((w) => ({ title: w.title, content: w.content }));
      const prompt = buildContextPrompt(chunksForPrompt, entry.question);
      const generatedAnswer = await generateAnswer(prompt);
      const judgeResult = await judgeAnswer(entry.question, entry.expectedAnswer, generatedAnswer);
      record.generatedAnswer = generatedAnswer;
      record.verdict = judgeResult.verdict;
      record.verdictReasoning = judgeResult.reasoning;
    }

    perQuestion.push(record);
  }

  const scoredQuestions = perQuestion.filter((q) => q.category !== UNANSWERABLE_CATEGORY);
  const overall = computeMetrics(
    scoredQuestions.map((q) => q.rank),
    scoredQuestions.map((q) => q.ndcg10),
  );
  const overallWindow = computeWindowMetrics(perQuestion);

  const categories = [...new Set(goldenSet.map((g) => g.category))];
  const byCategory: Record<string, Metrics> = {};
  const byCategoryWindow: Record<string, WindowMetrics> = {};
  for (const cat of categories) {
    const subset = perQuestion.filter((q) => q.category === cat);
    byCategory[cat] = computeMetrics(
      subset.map((q) => q.rank),
      subset.map((q) => q.ndcg10),
    );
    byCategoryWindow[cat] = computeWindowMetrics(subset);
  }

  let overallAnswerQuality: AnswerQualityMetrics | undefined;
  let byCategoryAnswerQuality: Record<string, AnswerQualityMetrics> | undefined;
  if (useAnswers) {
    overallAnswerQuality = computeAnswerQualityMetrics(perQuestion);
    byCategoryAnswerQuality = {};
    for (const cat of categories) {
      const subset = perQuestion.filter((q) => q.category === cat);
      byCategoryAnswerQuality[cat] = computeAnswerQualityMetrics(subset);
    }
  }

  console.log(
    `=== Overall (n=${overall.n}, excludes ${perQuestion.length - scoredQuestions.length} unanswerable question(s) from Recall/MRR/nDCG) ===`,
  );
  printMetrics(overall);
  printWindowMetrics(overallWindow);
  console.log("\n=== By category ===");
  for (const cat of categories) {
    console.log(`\n-- ${cat} (n=${byCategory[cat].n}) --`);
    printMetrics(byCategory[cat]);
    printWindowMetrics(byCategoryWindow[cat]);
  }

  if (useAnswers && overallAnswerQuality && byCategoryAnswerQuality) {
    console.log("\n=== Answer Quality (LLM judge, gated by --answers) ===");
    printAnswerQualityMetrics(overallAnswerQuality);
    console.log("\n-- By category --");
    for (const cat of categories) {
      console.log(`\n-- ${cat} (n=${byCategoryAnswerQuality[cat].n}) --`);
      printAnswerQualityMetrics(byCategoryAnswerQuality[cat]);
    }

    const unparseable = perQuestion.filter((q) => q.verdict === "unparseable");
    if (unparseable.length > 0) {
      console.log(
        `\n${unparseable.length} judge response(s) were unparseable and flagged as "unparseable" (not silently counted as pass or fail):`,
      );
      unparseable.forEach((u) => console.log(`  ${u.id} [${u.category}]: ${u.question}`));
    }
  }

  // Unanswerable questions are supposed to have no match in top TOP_K — that's the
  // correct outcome, not a miss. Only flag misses among questions expected to have one.
  const misses = scoredQuestions.filter((q) => q.rank === null);
  if (misses.length > 0) {
    console.log(`\n${misses.length} question(s) had no match in top ${TOP_K}:`);
    misses.forEach((m) => console.log(`  ${m.id} [${m.category}]: ${m.question}`));
  }

  // --- --conversations phase: multi-turn conversation eval + decomposition coverage ---
  // Independent of --rerank/--answers — runs its own planQuery + createUserPrompt calls
  // rather than reusing the single-turn loop above (createUserPrompt always reranks
  // internally, so this naturally exercises reranking regardless of --rerank).
  let conversationsResult: ConversationsEvalResult | undefined;
  let decompositionCoverage: DecompositionCoverageResult | undefined;
  if (useConversations) {
    console.log("\n=== Multi-turn conversation eval (--conversations) ===");
    conversationsResult = await runConversationsEval(admin.id);
    console.log(`Overall:`);
    printConversationMetrics("overall", conversationsResult.overall);
    console.log(`\nBy conversation:`);
    for (const [id, m] of Object.entries(conversationsResult.byConversation)) {
      printConversationMetrics(id, m);
    }
    const notEquivalent = conversationsResult.turns.filter(
      (t) => t.equivalenceVerdict !== "equivalent",
    );
    if (notEquivalent.length > 0) {
      console.log(
        `\n${notEquivalent.length} turn(s) judged not equivalent (or unparseable) to their reference resolved question:`,
      );
      notEquivalent.forEach((t) =>
        console.log(
          `  ${t.conversationId}#${t.turnIndex} [${t.equivalenceVerdict}]: actual="${t.plannerSelfContainedQuestion}" reference="${t.referenceSelfContainedQuestion}" (${t.equivalenceReasoning})`,
        ),
      );
    }

    console.log("\n=== Decomposition coverage (multi-chunk golden-set questions q061-q065) ===");
    decompositionCoverage = await runDecompositionCoverage(goldenSet, admin.id);
    printDecompositionCoverage(decompositionCoverage);
  }

  const resultsDir = path.join(process.cwd(), "tests/results");
  if (!existsSync(resultsDir)) mkdirSync(resultsDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = path.join(resultsDir, `eval-${timestamp}.json`);
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        topK: TOP_K,
        productionRelevanceThreshold: DEFAULT_RELEVANCE_THRESHOLD,
        productionMaxK: DEFAULT_MAX_K,
        overall,
        overallWindow,
        byCategory,
        byCategoryWindow,
        // Only present when run with --answers — keeps the report byte-for-byte
        // unchanged (aside from perQuestion's optional fields, also gated on --answers)
        // when the flag is absent.
        ...(useAnswers ? { overallAnswerQuality, byCategoryAnswerQuality } : {}),
        perQuestion,
        // Only present when run with --conversations — same additive-safe convention as
        // --answers above.
        ...(useConversations ? { conversations: conversationsResult, decompositionCoverage } : {}),
      },
      null,
      2,
    ),
  );
  const reportRelPath = path.relative(process.cwd(), outPath);
  console.log(`\nReport written to ${reportRelPath}`);

  const note = getNoteArg();
  const logPath = path.join(resultsDir, "eval-log.xlsx");
  await appendToExcelLog(
    [
      new Date().toISOString(),
      overall.n,
      TOP_K,
      round(overall.recall["@1"]),
      round(overall.recall["@3"]),
      round(overall.recall["@5"]),
      round(overall.recall["@10"]),
      round(overall.mrr),
      round(overall.ndcg10),
      byCategory["disambiguation"] ? round(byCategory["disambiguation"].recall["@1"]) : "",
      byCategory["trap"] ? round(byCategory["trap"].recall["@1"]) : "",
      misses.length,
      reportRelPath,
      note,
      useRerank ? "Y" : "N",
      overallWindow.multiChunkCoverage === null ? "" : round(overallWindow.multiChunkCoverage),
      overallWindow.unanswerableSuppressionRate === null
        ? ""
        : round(overallWindow.unanswerableSuppressionRate),
      round(overallWindow.avgChunkCount),
      overallAnswerQuality ? round(overallAnswerQuality.passRate) : "",
      conversationsResult ? round(conversationsResult.overall.condensationAccuracyRate) : "",
      conversationsResult ? round(conversationsResult.overall.retrievalRecallRate) : "",
      decompositionCoverage ? `${decompositionCoverage.triggeredCount}/${decompositionCoverage.n}` : "",
      decompositionCoverage
        ? `${decompositionCoverage.allDocsRetrievedCount}/${decompositionCoverage.n}`
        : "",
    ],
    logPath,
  );
  console.log(`Logged this run to ${path.relative(process.cwd(), logPath)}`);
  if (!note) {
    console.log(
      `Tip: pass --note "what changed" (e.g. npm run eval:retrieval -- --note "baseline, no changes") to record it in the log.`,
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
