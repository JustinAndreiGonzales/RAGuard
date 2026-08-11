import { auth } from "@/auth";
import { db } from "@/db";
import { documentChunks, documents, users } from "@/db/schema";
import { checkDocumentAccess } from "@/lib/documents/access";
import { supabase } from "@/lib/supabase";
import { count, eq } from "drizzle-orm";
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
    .select({
      id: documents.id,
      title: documents.title,
      originalFileName: documents.originalFileName,
      fileType: documents.fileType,
      fileSizeBytes: documents.fileSizeBytes,
      status: documents.status,
      embeddingModel: documents.embeddingModel,
      processingError: documents.processingError,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
      ownerId: users.id,
      ownerName: users.name,
    })
    .from(documents)
    .innerJoin(users, eq(documents.ownerId, users.id))
    .where(eq(documents.id, id))
    .limit(1);

  const [{ chunkCount }] = await db
    .select({ chunkCount: count() })
    .from(documentChunks)
    .where(eq(documentChunks.documentId, id));

  const { ownerId, ownerName, ...rest } = document;

  return NextResponse.json({
    ...rest,
    owner: { id: ownerId, name: ownerName },
    chunkCount,
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [document] = await db
    .select({
      id: documents.id,
      storagePath: documents.storagePath,
      status: documents.status,
      ownerId: documents.ownerId,
    })
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1);

  if (!document)
    return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const isAdmin = session.user.role === "admin";
  if (!isAdmin && document.ownerId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (document.status === "processing")
    return NextResponse.json(
      { error: "Cannot delete a document while it is processing" },
      { status: 409 },
    );

  const { error: storageError } = await supabase.storage
    .from("documents")
    .remove([document.storagePath]);

  if (storageError)
    console.warn("Failed to delete storage object", {
      documentId: id,
      storagePath: document.storagePath,
      error: storageError,
    });

  await db.delete(documents).where(eq(documents.id, id));

  return NextResponse.json({ success: true });
}
