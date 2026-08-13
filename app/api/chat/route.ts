import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { requireSession } from "@/lib/auth/guard";
import { client, model } from "@/lib/claude/client";
import { createUserPrompt } from "@/lib/claude/prompts/createUserPrompt";
import {
  HISTORY_WINDOW_SIZE,
  planQuery,
  type QueryPlan,
} from "@/lib/claude/prompts/queryPlanner";
import { systemPrompt } from "@/lib/claude/prompts/systemPrompt";
import { touchConversation } from "@/lib/db/queries/conversations";
import { and, desc, eq, ne } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

const NO_DOCUMENTS_MESSAGE =
  "You don't have access to any documents yet. Ask an admin to share one with you.";
const NO_RELEVANT_CHUNKS_MESSAGE =
  "I couldn't find anything in your documents relevant to that question.";
const NOT_A_DOCUMENT_QUESTION_MESSAGE =
  "I'm here to help answer questions about your documents. Feel free to ask me anything about them!";

const MAX_TITLE_LENGTH = 48;

function truncateTitle(text: string) {
  return text.length > MAX_TITLE_LENGTH
    ? `${text.slice(0, MAX_TITLE_LENGTH)}…`
    : text;
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

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

  const [insertedUserMessage] = await db
    .insert(messages)
    .values({
      conversationId: conversation.id,
      role: "user",
      content: userInput,
    })
    .returning();
  await touchConversation(conversation.id);

  // Query planning: resolve conversational references in userInput into a self-contained
  // question, and decompose comparison-style questions into per-document sub-queries.
  // Runs on every message (even with no prior history — a first-turn comparison question
  // still needs decomposition). A planner failure (bad JSON, API error, etc.) degrades
  // gracefully to today's single-turn behavior — treat userInput as both the retrieval
  // query and the displayed question — rather than hard-failing the whole request; a
  // slightly-worse-retrieval answer beats no answer at all.
  let plan: QueryPlan;
  try {
    const historyRows = await db
      .select({ role: messages.role, content: messages.content })
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conversation.id),
          ne(messages.kind, "system_notice"),
          ne(messages.id, insertedUserMessage.id),
        ),
      )
      .orderBy(desc(messages.createdAt))
      .limit(HISTORY_WINDOW_SIZE);

    const history = historyRows
      .slice()
      .reverse()
      .map((m) => ({ role: m.role, content: m.content }));

    plan = await planQuery(history, userInput);
  } catch (err) {
    console.error("Query planner failed, falling back to raw user input", err);
    // Degrade to today's pre-Phase-4 behavior: assume it's a document question and run
    // retrieval as normal, rather than silently skipping retrieval on planner failure.
    plan = { selfContainedQuestion: userInput, subQueries: null, isDocumentQuestion: true };
  }

  if (!plan.isDocumentQuestion) {
    await db.insert(messages).values({
      conversationId: conversation.id,
      role: "assistant",
      kind: "system_notice",
      content: NOT_A_DOCUMENT_QUESTION_MESSAGE,
    });
    await touchConversation(conversation.id);

    return new Response(NOT_A_DOCUMENT_QUESTION_MESSAGE, {
      headers: { "X-Conversation-Id": conversation.id },
    });
  }

  const queries = plan.subQueries ?? [plan.selfContainedQuestion];

  let result;
  try {
    result = await createUserPrompt(
      queries,
      plan.selfContainedQuestion,
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

  if (result.status === "no_documents" || result.status === "no_relevant_chunks") {
    const noticeMessage =
      result.status === "no_documents"
        ? NO_DOCUMENTS_MESSAGE
        : NO_RELEVANT_CHUNKS_MESSAGE;

    await db.insert(messages).values({
      conversationId: conversation.id,
      role: "assistant",
      kind: "system_notice",
      content: noticeMessage,
    });
    await touchConversation(conversation.id);

    return new Response(noticeMessage, {
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
        kind: "answer",
        content: fullText,
        citations,
      });
      await touchConversation(conversation.id);

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
