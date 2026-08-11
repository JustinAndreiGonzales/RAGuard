import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { documentChunks, documents } from "@/db/schema";
import { FileType } from "@/types/fileType";
import { inngest } from "@/lib/inngest/client";
import { supabase } from "@/lib/supabase";
import { eq } from "drizzle-orm";

export const maxDuration = 60;
export const maxFileSize = 20; // MB
export const mimeTypeToFileType = new Map<string, FileType>([
  ["application/pdf", "pdf"],
  ["text/plain", "txt"],
  [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "docx",
  ],
  ["text/markdown", "md"],
]);

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Step 1: Validate Input
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file)
    return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const fileType = mimeTypeToFileType.get(file.type);
  if (!fileType)
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });

  const maxSize = maxFileSize * 1024 * 1024;
  if (file.size > maxSize)
    return NextResponse.json(
      { error: `File too large (max ${maxFileSize}MB)` },
      { status: 400 },
    );

  const visibilityRaw = formData.get("visibility");
  const visibility = visibilityRaw === null ? "private" : String(visibilityRaw);
  if (visibility !== "private" && visibility !== "public")
    return NextResponse.json(
      { error: "Invalid visibility value" },
      { status: 400 },
    );
  if (visibility === "public" && session.user.role !== "admin")
    return NextResponse.json(
      { error: "Only admins can upload public documents" },
      { status: 403 },
    );

  const bytes = await file.arrayBuffer();

  // Step 2: Upload + create row
  const documentId = crypto.randomUUID();
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${session.user.id}/${documentId}-${cleanFileName}`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(storagePath, new Uint8Array(bytes), { contentType: file.type });

  if (uploadError)
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 },
    );

  await db.insert(documents).values({
    id: documentId,
    ownerId: session.user.id,
    visibility,
    title: file.name,
    originalFileName: file.name,
    fileType,
    storagePath,
    fileSizeBytes: file.size,
    status: "pending",
  });

  // send to inngest
  try {
    await inngest.send({
      name: "document/uploaded",
      data: { documentId, documentPath: storagePath, fileType },
    });
  } catch {
    await db
      .update(documents)
      .set({
        status: "failed",
        processingError: "Failed to queue document for processing",
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));

    return NextResponse.json({ documentId, status: "failed" });
  }

  return NextResponse.json({ documentId, status: "pending" });
}
