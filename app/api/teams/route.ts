import { db } from "@/db";
import { teamMembers, teams } from "@/db/schema";
import { requireAdmin, requireSession } from "@/lib/auth/guard";
import { insertHandlingConflict } from "@/lib/http/insertHandlingConflict";
import { parseJsonBody } from "@/lib/http/parseJsonBody";
import { count, eq, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

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
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const forbidden = requireAdmin(session);
  if (forbidden) return forbidden;

  const parsed = await parseJsonBody(request, postBodySchema);
  if (parsed instanceof NextResponse) return parsed;

  const { name } = parsed;

  return insertHandlingConflict(
    () => db.insert(teams).values({ name }).returning(),
    "Team already exists",
  );
}
