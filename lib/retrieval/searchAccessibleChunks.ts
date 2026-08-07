import { db } from "@/db";
import {
  documentChunks,
  documentPermissions,
  documents,
  teamMembers,
} from "@/db/schema";
import { and, cosineDistance, desc, eq, exists, or, sql } from "drizzle-orm";

export async function searchAccessibleChunks(
  queryEmbedding: number[],
  userId: string,
  isAdmin: boolean,
  topK: number,
) {
  const similarity = sql<number>`1 - (${cosineDistance(documentChunks.embedding, queryEmbedding)})`;

  const accessConditions = isAdmin
    ? undefined
    : or(
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

  const chunks = await db
    .select({
      id: documentChunks.id,
      documentId: documentChunks.documentId,
      title: documents.title,
      content: documentChunks.content,
      chunkIndex: documentChunks.chunkIndex,
      similarity,
    })
    .from(documentChunks)
    .innerJoin(documents, eq(documentChunks.documentId, documents.id))
    .where(and(eq(documents.status, "ready"), accessConditions))
    .orderBy(desc(similarity))
    .limit(topK);
  return chunks;
}
