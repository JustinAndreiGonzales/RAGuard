import { auth } from "@/auth";
import { db } from "@/db";
import { teamMembers } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
