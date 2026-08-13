import { db } from "@/db";
import { documents } from "@/db/schema";
import { requireSession } from "@/lib/auth/guard";
import { documentAccessCondition } from "@/lib/documents/access";
import { supabase } from "@/lib/supabase";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const isAdmin = session.user.role === "admin";

  const [document] = await db
    .select({ storagePath: documents.storagePath })
    .from(documents)
    .where(and(eq(documents.id, id), documentAccessCondition(session.user.id, isAdmin)))
    .limit(1);

  if (!document) {
    const [exists] = await db
      .select({ id: documents.id })
      .from(documents)
      .where(eq(documents.id, id))
      .limit(1);

    return NextResponse.json(
      { error: exists ? "Forbidden" : "Document not found" },
      { status: exists ? 403 : 404 },
    );
  }

  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(document.storagePath, 300);

  if (error || !data)
    return NextResponse.json(
      { error: "Failed to generate document URL" },
      { status: 500 },
    );

  return NextResponse.redirect(data.signedUrl);
}
