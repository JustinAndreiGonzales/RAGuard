import { auth } from "@/auth";
import { db } from "@/db";
import { documentPermissions, documents } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; permissionId: string }> },
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id, permissionId } = await params;

  if (session.user.role !== "admin") {
    const document = await db
      .select({ id: documents.id })
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.ownerId, session.user.id)))
      .limit(1);
    if (document.length === 0)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [deleted] = await db
    .delete(documentPermissions)
    .where(
      and(
        eq(documentPermissions.id, permissionId),
        eq(documentPermissions.documentId, id),
      ),
    )
    .returning();

  if (!deleted)
    return NextResponse.json(
      { error: "Permission not found" },
      { status: 404 },
    );

  return NextResponse.json({ success: true }, { status: 200 });
}
