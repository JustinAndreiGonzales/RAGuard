import { auth } from "@/auth";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { checkDocumentAccess } from "@/lib/documents/access";
import { supabase } from "@/lib/supabase";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const isAdmin = session.user.role === "admin";

  const access = await checkDocumentAccess(id, session.user.id, isAdmin);
  if (access === "not_found")
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  if (access === "forbidden")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [document] = await db
    .select({ storagePath: documents.storagePath })
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1);

  if (!document)
    return NextResponse.json({ error: "Document not found" }, { status: 404 });

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
