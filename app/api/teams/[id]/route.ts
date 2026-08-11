import { auth } from "@/auth";
import { db } from "@/db";
import { teamMembers, teams, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
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
    .select({ id: teams.id, name: teams.name, createdAt: teams.createdAt })
    .from(teams)
    .where(eq(teams.id, id))
    .limit(1);

  if (!team)
    return NextResponse.json({ error: "Team not found" }, { status: 404 });

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
