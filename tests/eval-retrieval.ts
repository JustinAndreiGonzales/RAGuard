import { db } from "@/db";
import { users } from "@/db/schema";
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
];

function getNoteArg(): string {
  const args = process.argv.slice(2);
  const idx = args.findIndex((a) => a === "--note" || a === "-n");
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : "";
}

function getRerankFlag(): boolean {
  return process.argv.slice(2).includes("--rerank");
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

function isMatch(entry: GoldenEntry, result: RankedResult): boolean {
  return entry.expectedChunks.some(
    (ec) => ec.documentTitle === result.title && ec.chunkIndex === result.chunkIndex,
  );
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

function multiChunkCoverage(entry: GoldenEntry, window: RankedResult[]): boolean {
  return entry.expectedChunks.every((ec) =>
    window.some((r) => r.title === ec.documentTitle && r.chunkIndex === ec.chunkIndex),
  );
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

  const perQuestion = [];
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
        relevanceScore: r.relevanceScore,
      }));
    } else {
      const results = await searchAccessibleChunks(embeddings[i], admin.id, true, TOP_K);
      ranked = results.map((r) => ({ title: r.title, chunkIndex: r.chunkIndex }));
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

    perQuestion.push({
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
    });
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

  // Unanswerable questions are supposed to have no match in top TOP_K — that's the
  // correct outcome, not a miss. Only flag misses among questions expected to have one.
  const misses = scoredQuestions.filter((q) => q.rank === null);
  if (misses.length > 0) {
    console.log(`\n${misses.length} question(s) had no match in top ${TOP_K}:`);
    misses.forEach((m) => console.log(`  ${m.id} [${m.category}]: ${m.question}`));
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
        perQuestion,
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
