import { db } from "@/db";
import { documentPermissions, documents, teamMembers, teams, users } from "@/db/schema";
import { searchAccessibleChunks } from "@/lib/retrieval/searchAccessibleChunks";
import { and, eq } from "drizzle-orm";

// M5 verification test: user A shares a doc with a team -> team member can
// query it; non-member still cannot. Mirrors the M4 cross-user leak test,
// exercised directly against searchAccessibleChunks (no HTTP/chat layer).
//
// Fixture assumptions (from db/seeds/seed.ts + seed.v2.ts):
// - alice owns "Alice Private Doc" with zero document_permissions rows
// - bob and oauth-stub@example.com exist and are NOT members of Engineering
// - "Engineering" team exists
//
// Run: npx tsx tests/verify-team-sharing.ts

const dummyQueryEmbedding = Array.from({ length: 1024 }, () => Math.random());

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`  ok: ${message}`);
}

async function hasAccessToDoc(userId: string, documentId: string) {
  const chunks = await searchAccessibleChunks(
    dummyQueryEmbedding,
    userId,
    false,
    100,
  );
  return chunks.some((c) => c.documentId === documentId);
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
  const [nonMember] = await db
    .select()
    .from(users)
    .where(eq(users.email, "oauth-stub@example.com"));
  const [engineering] = await db
    .select()
    .from(teams)
    .where(eq(teams.name, "Engineering"));

  assert(alice, "alice exists (run db:seed)");
  assert(bob, "bob exists (run db:seed)");
  assert(nonMember, "oauth-stub user exists (run db:seed)");
  assert(engineering, "Engineering team exists (run db:seed)");

  const [doc] = await db
    .select()
    .from(documents)
    .where(
      and(eq(documents.ownerId, alice.id), eq(documents.title, "Alice Private Doc")),
    );
  assert(doc, "Alice Private Doc exists (run db:seed:docs)");

  // Ensure a clean starting state in case this script was run before.
  await db
    .delete(documentPermissions)
    .where(
      and(
        eq(documentPermissions.documentId, doc.id),
        eq(documentPermissions.principalType, "team"),
        eq(documentPermissions.principalId, engineering.id),
      ),
    );
  await db
    .delete(teamMembers)
    .where(and(eq(teamMembers.teamId, engineering.id), eq(teamMembers.userId, bob.id)));

  try {
    console.log("Step 1: baseline (doc not shared, bob not on the team)");
    assert(
      !(await hasAccessToDoc(bob.id, doc.id)),
      "bob cannot see the doc before any sharing",
    );
    assert(
      !(await hasAccessToDoc(nonMember.id, doc.id)),
      "non-member cannot see the doc before any sharing",
    );

    console.log("Step 2: share the doc with Engineering, add bob to Engineering");
    await db.insert(documentPermissions).values({
      documentId: doc.id,
      principalType: "team",
      principalId: engineering.id,
      grantedBy: alice.id,
    });
    await db.insert(teamMembers).values({ teamId: engineering.id, userId: bob.id });

    console.log("Step 3: team member gains access, non-member still doesn't");
    assert(
      await hasAccessToDoc(bob.id, doc.id),
      "bob CAN see the doc after team share + team membership",
    );
    assert(
      !(await hasAccessToDoc(nonMember.id, doc.id)),
      "non-member still cannot see the doc (not on the team)",
    );

    console.log("Step 4: revoke the team share");
    await db
      .delete(documentPermissions)
      .where(
        and(
          eq(documentPermissions.documentId, doc.id),
          eq(documentPermissions.principalType, "team"),
          eq(documentPermissions.principalId, engineering.id),
        ),
      );

    assert(
      !(await hasAccessToDoc(bob.id, doc.id)),
      "bob loses access immediately after the share is revoked (still a team member)",
    );

    console.log("\nAll M5 sharing checks passed.");
  } finally {
    // Leave fixtures as we found them.
    await db
      .delete(documentPermissions)
      .where(
        and(
          eq(documentPermissions.documentId, doc.id),
          eq(documentPermissions.principalType, "team"),
          eq(documentPermissions.principalId, engineering.id),
        ),
      );
    await db
      .delete(teamMembers)
      .where(and(eq(teamMembers.teamId, engineering.id), eq(teamMembers.userId, bob.id)));
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
