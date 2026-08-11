import { auth } from "@/auth";
import { db } from "@/db";
import { teamMembers, teams } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const memberTeams = await db
    .select({ id: teams.id, name: teams.name })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(eq(teamMembers.userId, session.user.id));

  return NextResponse.json({
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    teams: memberTeams,
  });
}
