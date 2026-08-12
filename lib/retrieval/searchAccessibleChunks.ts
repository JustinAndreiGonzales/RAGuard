import { documentChunks, documents } from "@/db/schema";
import { documentAccessCondition } from "@/lib/documents/access";
import { and, cosineDistance, desc, eq, sql } from "drizzle-orm";
import { withUserContext } from "../db/withUserContext";

export async function searchAccessibleChunks(
  queryEmbedding: number[],
  userId: string,
  isAdmin: boolean,
  topK: number,
) {
  const similarity = sql<number>`1 - (${cosineDistance(documentChunks.embedding, queryEmbedding)})`;

  const accessConditions = documentAccessCondition(userId, isAdmin);

  return withUserContext(userId, isAdmin, async (tx) => {
    return tx
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
  });
}
