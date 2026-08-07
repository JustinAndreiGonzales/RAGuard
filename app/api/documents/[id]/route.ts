import { auth } from "@/auth";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [document] = await db
    .select({
      status: documents.status,
      processingError: documents.processingError,
    })
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.ownerId, session.user.id)));

  if (!document)
    return NextResponse.json({ error: "document not found" }, { status: 404 });

  return NextResponse.json({
    status: document.status,
    processingError: document.processingError,
  });
}
