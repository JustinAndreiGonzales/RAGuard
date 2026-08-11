import { auth } from "@/auth";
import { db } from "@/db";
import {
  documentPermissions,
  documents,
  teamMembers,
  teams,
  users,
} from "@/db/schema";
import { documentAccessCondition } from "@/lib/documents/access";
import { and, eq, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const ownerAlias = alias(users, "owner");
  const sharedUserAlias = alias(users, "sharedUser");

  if (session.user.role === "admin") {
    const anyPermission = db
      .selectDistinctOn([documentPermissions.documentId], {
        documentId: documentPermissions.documentId,
        principalType: documentPermissions.principalType,
        principalId: documentPermissions.principalId,
      })
      .from(documentPermissions)
      .orderBy(documentPermissions.documentId)
      .as("anyPermission");

    const allDocuments = await db
      .select({
        id: documents.id,
        owner: ownerAlias.name,
        title: documents.title,
        fileType: documents.fileType,
        status: documents.status,
        sharedVia: anyPermission.principalType,
        sharedName: sql<
          string | null
        >`coalesce(${sharedUserAlias.name}, ${teams.name})`,
        createdAt: documents.createdAt,
      })
      .from(documents)
      .innerJoin(ownerAlias, eq(documents.ownerId, ownerAlias.id))
      .leftJoin(anyPermission, eq(anyPermission.documentId, documents.id))
      .leftJoin(
        sharedUserAlias,
        and(
          eq(anyPermission.principalType, "user"),
          eq(anyPermission.principalId, sharedUserAlias.id),
        ),
      )
      .leftJoin(
        teams,
        and(
          eq(anyPermission.principalType, "team"),
          eq(anyPermission.principalId, teams.id),
        ),
      );

    return NextResponse.json(allDocuments);
  }

  const relevantPermission = db
    .selectDistinctOn([documentPermissions.documentId], {
      documentId: documentPermissions.documentId,
      principalType: documentPermissions.principalType,
      principalId: documentPermissions.principalId,
    })
    .from(documentPermissions)
    .leftJoin(
      teamMembers,
      and(
        eq(documentPermissions.principalType, "team"),
        eq(documentPermissions.principalId, teamMembers.teamId),
        eq(teamMembers.userId, userId),
      ),
    )
    .where(
      or(
        and(
          eq(documentPermissions.principalType, "user"),
          eq(documentPermissions.principalId, userId),
        ),
        and(
          eq(documentPermissions.principalType, "team"),
          eq(teamMembers.userId, userId),
        ),
      ),
    )
    .orderBy(documentPermissions.documentId)
    .as("relevantPermission");

  const userDocuments = await db
    .select({
      id: documents.id,
      owner: ownerAlias.name,
      title: documents.title,
      fileType: documents.fileType,
      status: documents.status,
      sharedVia: relevantPermission.principalType,
      sharedName: sql<
        string | null
      >`coalesce(${sharedUserAlias.name}, ${teams.name})`,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .innerJoin(ownerAlias, eq(documents.ownerId, ownerAlias.id))
    .leftJoin(
      relevantPermission,
      eq(relevantPermission.documentId, documents.id),
    )
    .leftJoin(
      sharedUserAlias,
      and(
        eq(relevantPermission.principalType, "user"),
        eq(relevantPermission.principalId, sharedUserAlias.id),
      ),
    )
    .leftJoin(
      teams,
      and(
        eq(relevantPermission.principalType, "team"),
        eq(relevantPermission.principalId, teams.id),
      ),
    )
    .where(documentAccessCondition(userId, false));

  return NextResponse.json(userDocuments);
}
