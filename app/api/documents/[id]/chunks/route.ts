import { auth } from "@/auth";
import { db } from "@/db";
import { documentChunks } from "@/db/schema";
import { checkDocumentAccess } from "@/lib/documents/access";
import { asc, count, eq } from "drizzle-orm";
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
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const isAdmin = session.user.role === "admin";

  const access = await checkDocumentAccess(id, session.user.id, isAdmin);
  if (access === "not_found")
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  if (access === "forbidden")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
    .where(eq(documentChunks.documentId, id))
    .orderBy(asc(documentChunks.chunkIndex))
    .limit(limit)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: count() })
    .from(documentChunks)
    .where(eq(documentChunks.documentId, id));

  return NextResponse.json({
    chunks,
    pagination: { limit, offset, total },
  });
}
