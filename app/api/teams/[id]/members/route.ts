import { auth } from "@/auth";
import { db } from "@/db";
import { teamMembers, teams, users } from "@/db/schema";
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
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

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

  const { userId } = parsed.data;

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

  try {
    const member = await db
      .insert(teamMembers)
      .values({
        teamId: id,
        userId,
      })
      .returning();
    return NextResponse.json(member, { status: 201 });
  } catch (err: any) {
    if (err.code === "23505" /* Postgres unique_violation */) {
      return NextResponse.json(
        { error: "Member already in team" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
