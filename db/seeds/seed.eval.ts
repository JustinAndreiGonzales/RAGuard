import { db } from "@/db";
import { documentChunks, documents, users } from "@/db/schema";
import { chunkText } from "@/lib/documents/chunk";
import { embedTexts } from "@/lib/documents/embed";
import { and, eq, like } from "drizzle-orm";
import { readFileSync } from "fs";
import path from "path";

const EVAL_PREFIX = "[EVAL] ";
const CORPUS_DIR = path.join(process.cwd(), "tests/fixtures/eval-corpus");

const EVAL_DOCS: { file: string; title: string }[] = [
  { file: "annual-report-2021.md", title: "Annual Report 2021" },
  { file: "annual-report-2022.md", title: "Annual Report 2022" },
  { file: "annual-report-2023.md", title: "Annual Report 2023" },
  { file: "employee-handbook-v1.md", title: "Employee Handbook v1 (2022)" },
  { file: "employee-handbook-v2.md", title: "Employee Handbook v2 (2024)" },
  { file: "product-spec-falcon-v1.md", title: "Product Spec — Falcon Drone v1" },
  { file: "product-spec-falcon-v2.md", title: "Product Spec — Falcon Drone v2" },
  {
    file: "incident-postmortem-2023-03.md",
    title: "Incident Postmortem — March 2023 Outage",
  },
  {
    file: "incident-postmortem-2023-11.md",
    title: "Incident Postmortem — November 2023 Firmware Incident",
  },
  { file: "vendor-contract-cloudscale.md", title: "Vendor Contract — CloudScale Hosting" },
  { file: "vendor-contract-datastream.md", title: "Vendor Contract — DataStream Analytics" },
  { file: "engineering-onboarding-guide.md", title: "Engineering Onboarding Guide" },
  { file: "it-asset-ticket-log.md", title: "IT Asset & Support Ticket Log" },
];

async function seed() {
  const [admin] = await db
    .select()
    .from(users)
    .where(eq(users.email, "admin@example.com"));
  if (!admin) throw new Error("admin@example.com not found (run db:seed first)");

  const evalDocFilter = and(
    eq(documents.ownerId, admin.id),
    like(documents.title, `${EVAL_PREFIX}%`),
  );

  const existing = await db.select({ id: documents.id }).from(documents).where(evalDocFilter);
  if (existing.length > 0) {
    await db.delete(documents).where(evalDocFilter);
    console.log(`Deleted ${existing.length} existing eval document(s).`);
  }

  for (let i = 0; i < EVAL_DOCS.length; i++) {
    const { file, title } = EVAL_DOCS[i];

    const content = readFileSync(path.join(CORPUS_DIR, file), "utf-8");
    const chunks = chunkText(content, {});
    const embeddings = await embedTexts(chunks, "document");

    await db.transaction(async (tx) => {
      const [doc] = await tx
        .insert(documents)
        .values({
          ownerId: admin.id,
          title: `${EVAL_PREFIX}${title}`,
          originalFileName: file,
          fileType: "md",
          storagePath: `eval/${file}`,
          fileSizeBytes: Buffer.byteLength(content),
          status: "ready",
          embeddingModel: "voyage-4-lite",
        })
        .returning();

      await tx.insert(documentChunks).values(
        chunks.map((chunk, idx) => ({
          documentId: doc.id,
          chunkIndex: idx,
          content: chunk,
          tokenCount: Math.ceil(chunk.length / 5),
          embedding: embeddings[idx],
        })),
      );
    });

    console.log(`Seeded "${title}" (${chunks.length} chunk(s)).`);
  }
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
