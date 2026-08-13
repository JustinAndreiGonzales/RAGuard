import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { requireSession } from "@/lib/auth/guard";
import { and, asc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

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
      kind: messages.kind,
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
      kind: m.kind,
      content: m.content,
      citations: m.citations ?? undefined,
      createdAt: m.createdAt,
    })),
  });
}
