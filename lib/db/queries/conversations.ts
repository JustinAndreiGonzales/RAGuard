import { db } from "@/db";
import { conversations } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Bumps a conversation's `updatedAt` so it sorts to the top of the user's
 * conversation list. Called at each point in the chat flow that produces a
 * new message (user message, system notice, or assistant answer).
 */
export async function touchConversation(conversationId: string) {
  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));
}
