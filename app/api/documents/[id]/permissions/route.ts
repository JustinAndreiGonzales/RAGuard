import { auth } from "@/auth";
import { db } from "@/db";
import {
  documentPermissions,
  documents,
  teamMembers,
  teams,
  users,
} from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

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
