import { auth } from "@/auth";
import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await params;

  const [conversation] = await db
    .select({
      id: conversations.id,
      title: conversations.title,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, session.user.id)))
    .limit(1);

  if (!conversation)
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

  const conversationMessages = await db
    .select({
      id: messages.id,
      role: messages.role,
      content: messages.content,
      citations: messages.citations,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));

  return NextResponse.json({
    ...conversation,
    messages: conversationMessages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      citations: m.citations ?? undefined,
      createdAt: m.createdAt,
    })),
  });
}
