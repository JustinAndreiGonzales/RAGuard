import { db } from "@/db";
import { teamMembers } from "@/db/schema";
import { requireAdmin, requireSession } from "@/lib/auth/guard";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const forbidden = requireAdmin(session);
  if (forbidden) return forbidden;

  const { id, userId } = await params;

  const [deleted] = await db
    .delete(teamMembers)
    .where(and(eq(teamMembers.teamId, id), eq(teamMembers.userId, userId)))
    .returning();

  if (!deleted)
    return NextResponse.json(
      { error: "Team member not found" },
      { status: 404 },
    );

  return NextResponse.json({ success: true }, { status: 200 });
}
