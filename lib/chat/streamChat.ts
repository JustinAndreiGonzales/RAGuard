export async function streamChat({
  userInput,
  conversationId,
  onChunk,
  signal,
}: {
  userInput: string;
  conversationId?: string | null;
  onChunk: (chunk: string) => void;
  signal?: AbortSignal;
}): Promise<{ conversationId: string; fullText: string }> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userInput, conversationId: conversationId ?? undefined }),
    signal,
  });

  if (!res.ok || !res.body) {
    const message = (await res.text().catch(() => "")) || `Chat request failed (${res.status})`;
    throw new Error(message);
  }

  const newConversationId = res.headers.get("X-Conversation-Id") ?? conversationId ?? "";
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    fullText += chunk;
    onChunk(chunk);
  }

  return { conversationId: newConversationId, fullText };
}
