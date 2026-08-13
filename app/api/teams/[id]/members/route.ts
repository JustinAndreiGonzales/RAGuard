import { db } from "@/db";
import { teamMembers, teams, users } from "@/db/schema";
import { requireAdmin, requireSession } from "@/lib/auth/guard";
import { insertHandlingConflict } from "@/lib/http/insertHandlingConflict";
import { parseJsonBody } from "@/lib/http/parseJsonBody";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

const postBodySchema = z.object({
  userId: z.uuid(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const forbidden = requireAdmin(session);
  if (forbidden) return forbidden;

  const { id } = await params;

  const parsed = await parseJsonBody(request, postBodySchema);
  if (parsed instanceof NextResponse) return parsed;

  const { userId } = parsed;

  const team = await db
    .select({ id: teams.id })
    .from(teams)
    .where(eq(teams.id, id))
    .limit(1);

  if (team.length === 0)
    return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const user = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user.length === 0)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  return insertHandlingConflict(
    () => db.insert(teamMembers).values({ teamId: id, userId }).returning(),
    "Member already in team",
  );
}
