"use client";

import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import { formatDateGroupLabel } from "@/lib/format";
import { MOCK_USER_HAS_DOCUMENT_ACCESS } from "@/lib/mock/data";
import {
  buildInitialConversations,
  generateMockReply,
  type ChatMessage,
  type Conversation,
} from "@/lib/mock/chat";

const MAX_TITLE_LENGTH = 48;

const truncateTitle = (text: string) =>
  text.length > MAX_TITLE_LENGTH
    ? `${text.slice(0, MAX_TITLE_LENGTH)}…`
    : text;

type ChatHistoryContextValue = {
  conversations: Conversation[];
  groupedConversations: [string, Conversation[]][];
  activeConversationId: string | null;
  activeConversation: Conversation | null;
  setActiveConversationId: (id: string) => void;
  draft: string;
  setDraft: (value: string) => void;
  isStreaming: boolean;
  showNoAccessState: boolean;
  handleNewChat: () => void;
  handleSend: () => void;
};

const ChatHistoryContext = createContext<ChatHistoryContextValue | null>(
  null,
);

export const ChatHistoryProvider = ({ children }: { children: ReactNode }) => {
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    buildInitialConversations(),
  );
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(() => conversations[0]?.id ?? null);
  const [draft, setDraft] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const showNoAccessState = !MOCK_USER_HAS_DOCUMENT_ACCESS;
  const activeConversation =
    conversations.find((c) => c.id === activeConversationId) ?? null;

  const groupedConversations = useMemo(() => {
    const sorted = [...conversations].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    );
    const groups = new Map<string, Conversation[]>();
    for (const conversation of sorted) {
      const label = formatDateGroupLabel(conversation.updatedAt);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(conversation);
    }
    return Array.from(groups.entries());
  }, [conversations]);

  const handleNewChat = () => {
    const newConversation: Conversation = {
      id: crypto.randomUUID(),
      title: "New conversation",
      messages: [],
      updatedAt: new Date(),
    };
    setConversations((prev) => [newConversation, ...prev]);
    setActiveConversationId(newConversation.id);
    setDraft("");
  };

  const handleSend = () => {
    if (!draft.trim() || isStreaming || showNoAccessState) return;

    const userText = draft.trim();
    const truncatedTitle = truncateTitle(userText);
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: userText,
      createdAt: new Date(),
    };

    let targetId = activeConversationId;
    let turnIndex = 0;

    if (targetId) {
      const existing = conversations.find((c) => c.id === targetId);
      turnIndex =
        existing?.messages.filter((m) => m.role === "assistant").length ?? 0;

      setConversations((prev) =>
        prev.map((c) =>
          c.id === targetId
            ? {
                ...c,
                title:
                  c.title === "New conversation" ? truncatedTitle : c.title,
                messages: [...c.messages, userMessage],
                updatedAt: new Date(),
              }
            : c,
        ),
      );
    } else {
      const newId = crypto.randomUUID();
      targetId = newId;
      setConversations((prev) => [
        {
          id: newId,
          title: truncatedTitle,
          messages: [userMessage],
          updatedAt: new Date(),
        },
        ...prev,
      ]);
      setActiveConversationId(newId);
    }

    setDraft("");
    setIsStreaming(true);

    const finalTargetId = targetId;
    setTimeout(() => {
      const reply = generateMockReply(userText, turnIndex);
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: reply.content,
        citations: reply.citations,
        createdAt: new Date(),
      };
      setConversations((prev) =>
        prev.map((c) =>
          c.id === finalTargetId
            ? {
                ...c,
                messages: [...c.messages, assistantMessage],
                updatedAt: new Date(),
              }
            : c,
        ),
      );
      setIsStreaming(false);
    }, 900);
  };

  const value: ChatHistoryContextValue = {
    conversations,
    groupedConversations,
    activeConversationId,
    activeConversation,
    setActiveConversationId,
    draft,
    setDraft,
    isStreaming,
    showNoAccessState,
    handleNewChat,
    handleSend,
  };

  return (
    <ChatHistoryContext.Provider value={value}>
      {children}
    </ChatHistoryContext.Provider>
  );
};

export function useChatHistory(): ChatHistoryContextValue {
  const ctx = useContext(ChatHistoryContext);
  if (!ctx) {
    throw new Error("useChatHistory must be used within a ChatHistoryProvider");
  }
  return ctx;
}
