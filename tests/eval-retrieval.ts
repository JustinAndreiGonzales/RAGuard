import { db } from "@/db";
import { users } from "@/db/schema";
import { embedTexts } from "@/lib/documents/embed";
import { rerankedSearch } from "@/lib/retrieval/rerankedSearch";
import { searchAccessibleChunks } from "@/lib/retrieval/searchAccessibleChunks";
import { eq } from "drizzle-orm";
import ExcelJS from "exceljs";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

interface GoldenEntry {
  id: string;
  question: string;
  documentTitle: string;
  expectedChunkIndexes: number[];
  category: string;
  expectedAnswer: string;
}

interface RankedResult {
  title: string;
  chunkIndex: number;
}

interface Metrics {
  n: number;
  recall: Record<string, number>;
  mrr: number;
  ndcg10: number;
}

const TOP_K = 20;
const RECALL_KS = [1, 3, 5, 10];
const NDCG_K = 10;

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
  return (
    result.title === entry.documentTitle &&
    entry.expectedChunkIndexes.includes(result.chunkIndex)
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
  const idealHits = Math.min(entry.expectedChunkIndexes.length, k);
  const idcg = Array.from({ length: idealHits }, (_, i) => 1 / Math.log2(i + 2)).reduce(
    (a, b) => a + b,
    0,
  );
  return idcg === 0 ? 0 : dcg / idcg;
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
      ranked = results.map((r) => ({ title: r.title, chunkIndex: r.chunkIndex }));
    } else {
      const results = await searchAccessibleChunks(embeddings[i], admin.id, true, TOP_K);
      ranked = results.map((r) => ({ title: r.title, chunkIndex: r.chunkIndex }));
    }
    const rank = findRank(entry, ranked);
    const ndcg10 = ndcgAtK(entry, ranked, NDCG_K);
    const matched = rank ? ranked[rank - 1] : undefined;
    perQuestion.push({
      id: entry.id,
      category: entry.category,
      question: entry.question,
      rank,
      ndcg10,
      matchedTitle: matched?.title ?? null,
      matchedChunkIndex: matched?.chunkIndex ?? null,
    });
  }

  const overall = computeMetrics(
    perQuestion.map((q) => q.rank),
    perQuestion.map((q) => q.ndcg10),
  );

  const categories = [...new Set(goldenSet.map((g) => g.category))];
  const byCategory: Record<string, Metrics> = {};
  for (const cat of categories) {
    const subset = perQuestion.filter((q) => q.category === cat);
    byCategory[cat] = computeMetrics(
      subset.map((q) => q.rank),
      subset.map((q) => q.ndcg10),
    );
  }

  console.log("=== Overall ===");
  printMetrics(overall);
  console.log("\n=== By category ===");
  for (const cat of categories) {
    console.log(`\n-- ${cat} (n=${byCategory[cat].n}) --`);
    printMetrics(byCategory[cat]);
  }

  const misses = perQuestion.filter((q) => q.rank === null);
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
        overall,
        byCategory,
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
