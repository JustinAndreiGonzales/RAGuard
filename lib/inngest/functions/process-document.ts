import { db } from "@/db";
import { inngest } from "../client";
import { documentChunks, documents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { chunkText } from "@/lib/documents/chunk";
import { embedTexts } from "@/lib/documents/embed";
import { supabase } from "@/lib/supabase";
import { NonRetriableError } from "inngest";
import { extractText } from "@/lib/documents/extract";

export const processDocument = inngest.createFunction(
  {
    id: "process-document",
    retries: 3,
    concurrency: { limit: 5 },

    onFailure: async ({ event, error, step }) => {
      const { documentId } = event.data.event.data;
      await step.run("mark-document-failed", async () => {
        await db
          .update(documents)
          .set({
            status: "failed",
            processingError:
              error instanceof Error ? error.message : "Unknown error",
            updatedAt: new Date(),
          })
          .where(eq(documents.id, documentId));
      });
    },
    triggers: { event: "document/uploaded" },
  },
  async ({ event, step }) => {
    const { documentId, documentPath, fileType } = event.data;

    // change status to processing
    // download document
    await step.run("mark-processing", async () => {
      await db
        .update(documents)
        .set({
          status: "processing",
          updatedAt: new Date(),
        })
        .where(eq(documents.id, documentId));
    });

    // extract text
    // chunk text
    const chunks = await step.run("download-and-extract", async () => {
      const { data, error } = await supabase.storage
        .from("documents")
        .download(documentPath);

      if (error) throw new Error("File not found at given URL");

      const bytes = await data.arrayBuffer();
      const buffer = Buffer.from(bytes);

      let extracted: string;
      try {
        extracted = await extractText(buffer, fileType);
      } catch (err) {
        throw new NonRetriableError(
          err instanceof Error ? err.message : "Failed to extract text",
        );
      }

      return chunkText(extracted, {});
    });

    // embed chunks
    // save to db
    await step.run("embed-and-save", async () => {
      const embeddings = await embedTexts(chunks, "document");

      await db.transaction(async (tx) => {
        await tx.insert(documentChunks).values(
          chunks.map((content, i) => ({
            documentId,
            chunkIndex: i,
            content,
            tokenCount: Math.ceil(content.length / 5),
            embedding: embeddings[i],
          })),
        );

        await tx
          .update(documents)
          .set({
            status: "ready",
            embeddingModel: "voyage-4-lite",
            updatedAt: new Date(),
          })
          .where(eq(documents.id, documentId));
      });
    });
  },
);
