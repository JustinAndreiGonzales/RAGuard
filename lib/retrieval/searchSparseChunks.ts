import { documentChunks, documents } from "@/db/schema";
import { documentAccessCondition } from "@/lib/documents/access";
import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { withUserContext } from "../db/withUserContext";

// Quoted spans are phrase-matched (word order/adjacency matters); everything
// else is OR'd term-by-term so partial overlap still ranks instead of requiring
// every word in the question to co-occur in the same chunk.
function extractQuotedPhrases(query: string): { phrases: string[]; remainder: string } {
  const phrases: string[] = [];
  const remainder = query.replace(/"([^"]+)"/g, (_match, phrase: string) => {
    phrases.push(phrase);
    return " ";
  });
  return { phrases, remainder };
}

function buildTsQuery(query: string): SQL {
  const { phrases, remainder } = extractQuotedPhrases(query);

  const termsQuery = sql`to_tsquery('english', replace(plainto_tsquery('english', ${remainder})::text, ' & ', ' | '))`;
  const phraseQueries = phrases.map(
    (phrase) => sql`phraseto_tsquery('english', ${phrase})`,
  );

  return phraseQueries.length > 0
    ? sql`(${termsQuery} || ${sql.join(phraseQueries, sql` || `)})`
    : sql`(${termsQuery})`;
}

export async function searchSparseChunks(
  query: string,
  userId: string,
  isAdmin: boolean,
  topK: number,
) {
  const tsQuery = buildTsQuery(query);
  const rank = sql<number>`ts_rank_cd(${documentChunks.contentTsv}, ${tsQuery})`;
  const accessConditions = documentAccessCondition(userId, isAdmin);

  return withUserContext(userId, isAdmin, async (tx) => {
    return tx
      .select({
        id: documentChunks.id,
        documentId: documentChunks.documentId,
        title: documents.title,
        content: documentChunks.content,
        chunkIndex: documentChunks.chunkIndex,
        rank,
      })
      .from(documentChunks)
      .innerJoin(documents, eq(documentChunks.documentId, documents.id))
      .where(and(
        eq(documents.status, "ready"),
        sql`${documentChunks.contentTsv} @@ ${tsQuery}`,
        accessConditions,
      ))
      .orderBy(desc(rank))
      .limit(topK);
  });
}
