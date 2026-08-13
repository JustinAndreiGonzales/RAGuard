import { db } from "@/db";
import {
  documentPermissions,
  documents,
  teamMembers,
  teams,
  users,
} from "@/db/schema";
import { requireSession } from "@/lib/auth/guard";
import { documentAccessCondition } from "@/lib/documents/access";
import { and, eq, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const userId = session.user.id;
  const isAdmin = session.user.role === "admin";
  const ownerAlias = alias(users, "owner");
  const sharedUserAlias = alias(users, "sharedUser");

  // Admins see any permission row per document (just to surface how a doc happens
  // to be shared); non-admins only see the permission row that grants *them*
  // access, scoped to their own team memberships.
  const permission = isAdmin
    ? db
        .selectDistinctOn([documentPermissions.documentId], {
          documentId: documentPermissions.documentId,
          principalType: documentPermissions.principalType,
          principalId: documentPermissions.principalId,
        })
        .from(documentPermissions)
        .orderBy(documentPermissions.documentId)
        .as("permission")
    : db
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
        .as("permission");

  const accessibleDocuments = await db
    .select({
      id: documents.id,
      owner: ownerAlias.name,
      title: documents.title,
      fileType: documents.fileType,
      status: documents.status,
      sharedVia: permission.principalType,
      sharedName: sql<
        string | null
      >`coalesce(${sharedUserAlias.name}, ${teams.name})`,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .innerJoin(ownerAlias, eq(documents.ownerId, ownerAlias.id))
    .leftJoin(permission, eq(permission.documentId, documents.id))
    .leftJoin(
      sharedUserAlias,
      and(
        eq(permission.principalType, "user"),
        eq(permission.principalId, sharedUserAlias.id),
      ),
    )
    .leftJoin(
      teams,
      and(
        eq(permission.principalType, "team"),
        eq(permission.principalId, teams.id),
      ),
    )
    .where(isAdmin ? undefined : documentAccessCondition(userId, false));

  return NextResponse.json(accessibleDocuments);
}
