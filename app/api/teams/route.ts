import { auth } from "@/auth";
import { db } from "@/db";
import { teamMembers, teams } from "@/db/schema";
import { count, eq, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  if (session.user.role === "admin") {
    const availableTeams = await db
      .select({
        id: teams.id,
        name: teams.name,
        memberCount: count(teamMembers.teamId),
      })
      .from(teams)
      .leftJoin(teamMembers, eq(teams.id, teamMembers.teamId))
      .groupBy(teams.id);
    return NextResponse.json(availableTeams);
  }

  const userTeams = await db
    .select({
      id: teams.id,
      name: teams.name,
    })
    .from(teams)
    .innerJoin(teamMembers, eq(teams.id, teamMembers.teamId))
    .where(eq(teamMembers.userId, session.user.id));

  const teamIds = userTeams.map((t) => t.id);
  const counts = teamIds.length
    ? await db
        .select({
          teamId: teamMembers.teamId,
          memberCount: count(teamMembers.teamId),
        })
        .from(teamMembers)
        .where(inArray(teamMembers.teamId, teamIds))
        .groupBy(teamMembers.teamId)
    : [];
  const countByTeamId = new Map(counts.map((c) => [c.teamId, c.memberCount]));

  const availableTeams = userTeams.map((t) => ({
    ...t,
    memberCount: countByTeamId.get(t.id) ?? 0,
  }));
  return NextResponse.json(availableTeams);
}

const postBodySchema = z.object({
  name: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = postBodySchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid Request Body", details: z.treeifyError(parsed.error) },
      { status: 400 },
    );

  const { name } = parsed.data;

  try {
    const team = await db.insert(teams).values({ name }).returning();
    return NextResponse.json(team, { status: 201 });
  } catch (err: any) {
    if (err.code === "23505" /* Postgres unique_violation */) {
      return NextResponse.json(
        { error: "Team already exists" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
