import api from "./client";
import type { ConversationDetail, ConversationSummary } from "./types";

export async function getConversations(): Promise<ConversationSummary[]> {
  const { data } = await api.get<ConversationSummary[]>("/conversations");
  return data;
}

export async function createConversation(
  title?: string,
): Promise<ConversationDetail> {
  const { data } = await api.post<ConversationDetail>(
    "/conversations",
    title ? { title } : {},
  );
  return data;
}

export async function getConversation(
  id: string,
): Promise<ConversationDetail> {
  const { data } = await api.get<ConversationDetail>(`/conversations/${id}`);
  return data;
}
