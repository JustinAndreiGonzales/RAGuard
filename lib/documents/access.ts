import { db } from "@/db";
import { documentPermissions, documents, teamMembers } from "@/db/schema";
import { and, eq, exists, or, SQL } from "drizzle-orm";

export function documentAccessCondition(
  userId: string,
  isAdmin: boolean,
): SQL | undefined {
  return isAdmin
    ? undefined
    : or(
        // public document
        eq(documents.visibility, "public"),
        // owner of file
        eq(documents.ownerId, userId),
        exists(
          db
            .select()
            .from(documentPermissions)
            .where(
              and(
                eq(documentPermissions.documentId, documents.id),
                or(
                  // shared to user
                  and(
                    eq(documentPermissions.principalType, "user"),
                    eq(documentPermissions.principalId, userId),
                  ),
                  // shared to team
                  and(
                    eq(documentPermissions.principalType, "team"),
                    exists(
                      db
                        .select()
                        .from(teamMembers)
                        .where(
                          and(
                            eq(
                              teamMembers.teamId,
                              documentPermissions.principalId,
                            ),
                            eq(teamMembers.userId, userId),
                          ),
                        ),
                    ),
                  ),
                ),
              ),
            ),
        ),
      );
}

export async function checkDocumentAccess(
  documentId: string,
  userId: string,
  isAdmin: boolean,
): Promise<"ok" | "not_found" | "forbidden"> {
  const accessible = await db
    .select({ id: documents.id })
    .from(documents)
    .where(
      and(eq(documents.id, documentId), documentAccessCondition(userId, isAdmin)),
    )
    .limit(1);

  if (accessible.length > 0) return "ok";

  const found = await db
    .select({ id: documents.id })
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  return found.length === 0 ? "not_found" : "forbidden";
}
