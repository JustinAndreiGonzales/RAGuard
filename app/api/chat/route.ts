import { auth } from "@/auth";
import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { client, model } from "@/lib/claude/client";
import { createUserPrompt } from "@/lib/claude/prompts/createUserPrompt";
import { systemPrompt } from "@/lib/claude/prompts/systemPrompt";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

const NO_ACCESS_MESSAGE =
  "You don't have access to any documents yet. Ask an admin to share one with you.";

const MAX_TITLE_LENGTH = 48;

function truncateTitle(text: string) {
  return text.length > MAX_TITLE_LENGTH
    ? `${text.slice(0, MAX_TITLE_LENGTH)}…`
    : text;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userInput, conversationId } = await request.json();

  if (!userInput)
    return NextResponse.json(
      { error: "Missing/malformed body" },
      { status: 400 },
    );

  let conversation;
  if (conversationId) {
    [conversation] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.userId, session.user.id),
        ),
      )
      .limit(1);
    if (!conversation)
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
  } else {
    [conversation] = await db
      .insert(conversations)
      .values({ userId: session.user.id, title: truncateTitle(userInput) })
      .returning();
  }

  await db.insert(messages).values({
    conversationId: conversation.id,
    role: "user",
    content: userInput,
  });
  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversation.id));

  let result;
  try {
    result = await createUserPrompt(
      userInput,
      session.user.id,
      session.user.role === "admin",
    );
  } catch (err) {
    console.error("Failed to build chat prompt", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }

  if (result === null) {
    await db.insert(messages).values({
      conversationId: conversation.id,
      role: "assistant",
      content: NO_ACCESS_MESSAGE,
    });
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversation.id));

    return new Response(NO_ACCESS_MESSAGE, {
      headers: { "X-Conversation-Id": conversation.id },
    });
  }

  const { prompt: userPrompt, chunks: relevantChunks } = result;

  const claudeStream = client.messages.stream({
    model: model,
    max_tokens: 4096,
    thinking: { type: "disabled" },
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const encoder = new TextEncoder();
  let fullText = "";

  const readable = new ReadableStream({
    async start(controller) {
      for await (const event of claudeStream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          fullText += event.delta.text;
          controller.enqueue(encoder.encode(event.delta.text));
        }
      }
      const citations = relevantChunks.map((chunk) => ({
        documentId: chunk.documentId,
        documentTitle: chunk.title,
        excerpt: chunk.content.slice(0, 300),
      }));

      await db.insert(messages).values({
        conversationId: conversation.id,
        role: "assistant",
        content: fullText,
        citations,
      });
      await db
        .update(conversations)
        .set({ updatedAt: new Date() })
        .where(eq(conversations.id, conversation.id));

      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Conversation-Id": conversation.id,
    },
  });
}
