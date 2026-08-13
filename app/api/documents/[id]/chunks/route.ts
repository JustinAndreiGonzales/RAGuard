import { db } from "@/db";
import { documentChunks, documents } from "@/db/schema";
import { requireSession } from "@/lib/auth/guard";
import { checkDocumentAccess, documentAccessCondition } from "@/lib/documents/access";
import { and, asc, count, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const isAdmin = session.user.role === "admin";

  const parsed = paginationSchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid Request Body", details: z.treeifyError(parsed.error) },
      { status: 400 },
    );

  const { limit, offset } = parsed.data;

  const chunks = await db
    .select({
      id: documentChunks.id,
      chunkIndex: documentChunks.chunkIndex,
      content: documentChunks.content,
      tokenCount: documentChunks.tokenCount,
      createdAt: documentChunks.createdAt,
    })
    .from(documentChunks)
    .innerJoin(documents, eq(documentChunks.documentId, documents.id))
    .where(
      and(
        eq(documentChunks.documentId, id),
        documentAccessCondition(session.user.id, isAdmin),
      ),
    )
    .orderBy(asc(documentChunks.chunkIndex))
    .limit(limit)
    .offset(offset);

  // An empty page is ambiguous on its own (no access vs. a legitimately empty/
  // out-of-range page), so only re-check access as a fallback when it happens.
  if (chunks.length === 0) {
    const access = await checkDocumentAccess(id, session.user.id, isAdmin);
    if (access === "not_found")
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    if (access === "forbidden")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [{ total }] = await db
    .select({ total: count() })
    .from(documentChunks)
    .where(eq(documentChunks.documentId, id));

  return NextResponse.json({
    chunks,
    pagination: { limit, offset, total },
  });
}
