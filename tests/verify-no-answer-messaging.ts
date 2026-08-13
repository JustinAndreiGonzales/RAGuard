import { db } from "@/db";
import { documents, users } from "@/db/schema";
import { createUserPrompt } from "@/lib/claude/prompts/createUserPrompt";
import { eq } from "drizzle-orm";

// Phase 0 verification: createUserPrompt distinguishes "no accessible documents"
// from "documents exist but none are relevant to this question" via its
// discriminated-union return value, instead of collapsing both to `null`.
//
// Fixture assumptions (from db/seeds/seed.ts + seed.v2.ts):
// - bob exists, owns no documents, is on no team with a shared doc, and has no
//   direct document_permissions grants.
// - alice owns "Alice Private Doc" (status "ready"), a mock RAG test PDF with
//   filler content about testing retrieval pipelines - she has at least one
//   accessible ready document.
// - The dev DB also has a "public" visibility document ("Meridean
//   Outfitter.docx") which every user (including bob) can see regardless of
//   ownership/sharing. To exercise the true "zero accessible documents" case
//   we temporarily flip any public document(s) to "private" for the duration
//   of Case 1 only, restoring their original visibility in a finally block -
//   same cleanup-in-finally pattern as tests/verify-team-sharing.ts.
//
// Run: npx tsx tests/verify-no-answer-messaging.ts

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`  ok: ${message}`);
}

async function main() {
  const [alice] = await db
    .select()
    .from(users)
    .where(eq(users.email, "alice@example.com"));
  const [bob] = await db
    .select()
    .from(users)
    .where(eq(users.email, "bob@example.com"));

  assert(alice, "alice exists (run db:seed)");
  assert(bob, "bob exists (run db:seed)");

  console.log(
    "Case 1: user with zero accessible ready documents -> status 'no_documents'",
  );
  const publicDocs = await db
    .select({ id: documents.id })
    .from(documents)
    .where(eq(documents.visibility, "public"));

  try {
    if (publicDocs.length > 0) {
      for (const doc of publicDocs) {
        await db
          .update(documents)
          .set({ visibility: "private" })
          .where(eq(documents.id, doc.id));
      }
    }

    const noDocsResult = await createUserPrompt(
      ["What does the document say about anything at all?"],
      "What does the document say about anything at all?",
      bob.id,
      false,
    );
    assert(
      noDocsResult.status === "no_documents",
      `bob (no accessible ready docs) gets status "no_documents", got "${noDocsResult.status}"`,
    );
  } finally {
    for (const doc of publicDocs) {
      await db
        .update(documents)
        .set({ visibility: "public" })
        .where(eq(documents.id, doc.id));
    }
  }

  console.log(
    "Case 2: user with accessible documents but an off-topic question -> status 'no_relevant_chunks'",
  );
  const offTopicResult = await createUserPrompt(
    ["What is the recommended annual maintenance schedule for a commercial espresso machine?"],
    "What is the recommended annual maintenance schedule for a commercial espresso machine?",
    alice.id,
    false,
  );
  assert(
    offTopicResult.status === "no_relevant_chunks",
    `alice (has accessible ready docs, irrelevant question) gets status "no_relevant_chunks", got "${offTopicResult.status}"`,
  );

  console.log("\nAll no-answer-messaging checks passed.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
