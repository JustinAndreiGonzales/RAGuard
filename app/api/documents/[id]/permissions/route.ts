import { db } from "@/db";
import { documentPermissions, teams, users } from "@/db/schema";
import { requireSession } from "@/lib/auth/guard";
import { requireDocumentOwnerOrAdmin } from "@/lib/documents/access";
import { insertHandlingConflict } from "@/lib/http/insertHandlingConflict";
import { parseJsonBody } from "@/lib/http/parseJsonBody";
import { eq, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { id } = await params;

  const forbidden = await requireDocumentOwnerOrAdmin(
    id,
    session.user.id,
    session.user.role === "admin",
  );
  if (forbidden) return forbidden;

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
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { id } = await params;

  const forbidden = await requireDocumentOwnerOrAdmin(
    id,
    session.user.id,
    session.user.role === "admin",
  );
  if (forbidden) return forbidden;

  const parsed = await parseJsonBody(request, postBodySchema);
  if (parsed instanceof NextResponse) return parsed;

  const { principalType, principalId } = parsed;

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

  return insertHandlingConflict(async () => {
    const [newPermission] = await db
      .insert(documentPermissions)
      .values({
        documentId: id,
        principalType: principalType,
        principalId: principalId,
        grantedBy: session.user.id,
      })
      .returning();
    return newPermission;
  }, "Permission already exists for this principal");
}
