import { auth } from "@/auth";
import { db } from "@/db";
import { documentPermissions, teamMembers, teams, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await params;
  const isAdmin = session.user.role === "admin";

  const [team] = await db
    .select({ id: teams.id, name: teams.name, createdAt: teams.createdAt })
    .from(teams)
    .where(eq(teams.id, id))
    .limit(1);

  if (!team)
    return NextResponse.json({ error: "Team not found" }, { status: 404 });

  if (!isAdmin) {
    const [membership] = await db
      .select({ userId: teamMembers.userId })
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, id),
          eq(teamMembers.userId, session.user.id),
        ),
      )
      .limit(1);

    if (!membership)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const members = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      joinedAt: teamMembers.createdAt,
    })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .where(eq(teamMembers.teamId, id));

  return NextResponse.json({ ...team, members });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const [team] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(eq(teams.id, id))
    .limit(1);

  if (!team)
    return NextResponse.json({ error: "Team not found" }, { status: 404 });

  await db.transaction(async (tx) => {
    // team_members cascades via FK, but document_permissions.principal_id
    // is a polymorphic column with no FK, so team-scoped grants must be
    // deleted explicitly.
    await tx
      .delete(documentPermissions)
      .where(
        and(
          eq(documentPermissions.principalType, "team"),
          eq(documentPermissions.principalId, id),
        ),
      );

    await tx.delete(teams).where(eq(teams.id, id));
  });

  return NextResponse.json({ success: true });
}
