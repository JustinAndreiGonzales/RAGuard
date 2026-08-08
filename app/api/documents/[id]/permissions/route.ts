import { auth } from "@/auth";
import { db } from "@/db";
import { documentPermissions, documents, teams, users } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await params;

  if (session.user.role !== "admin") {
    const document = await db
      .select({ id: documents.id })
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.ownerId, session.user.id)))
      .limit(1);

    if (document.length === 0)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const permissions = await db
    .select({
      id: documentPermissions.id,
      principalId: documentPermissions.principalId,
      principalType: documentPermissions.principalType,
      grantedBy: documentPermissions.grantedBy,
    })
    .from(documentPermissions)
    .where(eq(documentPermissions.documentId, id));

  const userIds = permissions
    .filter((p) => p.principalType === "user")
    .map((p) => p.principalId);

  const teamIds = permissions
    .filter((p) => p.principalType === "team")
    .map((p) => p.principalId);

  const docUsers = userIds.length
    ? await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(inArray(users.id, userIds))
    : [];

  const docTeams = teamIds.length
    ? await db
        .select({ id: teams.id, name: teams.name })
        .from(teams)
        .where(inArray(teams.id, teamIds))
    : [];

  const docPermissions = permissions.map((p) => ({
    ...p,
    name:
      p.principalType === "team"
        ? docTeams.find((t) => t.id === p.principalId)?.name
        : docUsers.find((t) => t.id === p.principalId)?.name,
  }));

  return NextResponse.json(docPermissions, { status: 200 });
}

const postBodySchema = z.object({
  principalType: z.enum(["user", "team"]),
  principalId: z.uuid(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await params;

  if (session.user.role !== "admin") {
    const document = await db
      .select({ id: documents.id })
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.ownerId, session.user.id)))
      .limit(1);

    if (document.length === 0)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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

  const { principalType, principalId } = parsed.data;

  if (principalType === "team") {
    const team = await db
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.id, principalId))
      .limit(1);
    if (team.length === 0)
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }
  if (principalType === "user") {
    if (principalId === session.user.id)
      return NextResponse.json(
        { error: "Cannot share to self" },
        { status: 400 },
      );
    const user = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, principalId))
      .limit(1);
    if (user.length === 0)
      return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    const [newPermission] = await db
      .insert(documentPermissions)
      .values({
        documentId: id,
        principalType: principalType,
        principalId: principalId,
        grantedBy: session.user.id,
      })
      .returning();
    return NextResponse.json(newPermission, { status: 201 });
  } catch (err: any) {
    if (err.code === "23505" /* Postgres unique_violation */) {
      return NextResponse.json(
        { error: "Permission already exists for this principal" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
