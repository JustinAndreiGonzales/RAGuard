import { auth } from "@/auth";
import { client, model } from "@/lib/claude/client";
import { createUserPrompt } from "@/lib/claude/prompts/createUserPrompt";
import { systemPrompt } from "@/lib/claude/prompts/systemPrompt";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userInput } = await request.json();

  if (!userInput)
    return NextResponse.json(
      { error: "Missing/malformed body" },
      { status: 400 },
    );

  const userPrompt = await createUserPrompt(
    userInput,
    session.user.id,
    session.user.role === "admin",
  );

  if (userPrompt === null)
    return new Response(
      "You don't have access to any documents yet. Ask an admin to share one with you.",
    );

  const claudeStream = client.messages.stream({
    model: model,
    max_tokens: 4096,
    thinking: { type: "disabled" },
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const event of claudeStream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          controller.enqueue(encoder.encode(event.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
