import { db } from "@/db";
import { conversations } from "@/db/schema";
import { requireSession } from "@/lib/auth/guard";
import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

export async function GET() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const rows = await db
    .select({
      id: conversations.id,
      title: conversations.title,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .where(eq(conversations.userId, session.user.id))
    .orderBy(desc(conversations.updatedAt));

  return NextResponse.json(rows);
}

const postBodySchema = z.object({
  title: z.string().min(1).optional(),
});

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  let body: unknown = {};
  const rawBody = await request.text();
  if (rawBody) {
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
  }

  const parsed = postBodySchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid Request Body", details: z.treeifyError(parsed.error) },
      { status: 400 },
    );

  const [conversation] = await db
    .insert(conversations)
    .values({
      userId: session.user.id,
      title: parsed.data.title ?? "New conversation",
    })
    .returning();

  return NextResponse.json(
    {
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      messages: [],
    },
    { status: 201 },
  );
}
