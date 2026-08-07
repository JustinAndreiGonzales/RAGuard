import { db } from "@/db";
import { documentChunks, documents, users } from "@/db/schema";
import { chunkText } from "@/lib/documents/chunk";
import { embedTexts } from "@/lib/documents/embed";
import { extractText } from "@/lib/documents/extract";
import { supabase } from "@/lib/supabase";
import { eq } from "drizzle-orm";

async function seed() {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, "alice@example.com"));

  const documentPath = `${user.id}/rag_test_mock.pdf`;

  const [privateDoc] = await db
    .insert(documents)
    .values({
      ownerId: user.id,
      title: "Alice Private Doc",
      originalFileName: "rag_test_mock.pdf",
      fileType: "pdf",
      storagePath: documentPath,
      fileSizeBytes: 0,
      status: "ready",
      embeddingModel: "voyage-4-lite",
    })
    .returning();

  const { data, error } = await supabase.storage
    .from("documents")
    .download(documentPath);
  if (error) throw new Error("File not found at given URL");

  const bytes = await data.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const text = await extractText(buffer, "pdf");
  const chunks = chunkText(text, {});
  const embeddings = await embedTexts(chunks, "document");

  await db.insert(documentChunks).values(
    chunks.map((chunk, idx) => ({
      documentId: privateDoc.id,
      chunkIndex: idx,
      content: chunk,
      tokenCount: Math.ceil(chunk.length / 5),
      embedding: embeddings[idx],
    })),
  );
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
