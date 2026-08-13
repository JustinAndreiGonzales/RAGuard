import { db } from "@/db";
import { documentPermissions } from "@/db/schema";
import { requireSession } from "@/lib/auth/guard";
import { requireDocumentOwnerOrAdmin } from "@/lib/documents/access";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; permissionId: string }> },
) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { id, permissionId } = await params;

  const forbidden = await requireDocumentOwnerOrAdmin(
    id,
    session.user.id,
    session.user.role === "admin",
  );
  if (forbidden) return forbidden;

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
