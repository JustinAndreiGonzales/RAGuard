"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";
import { queryKeys } from "@/lib/api/queryKeys";
import type { ConversationDetail, ConversationSummary } from "@/lib/api/types";
import { streamChat } from "@/lib/chat/streamChat";
import {
  useConversationQuery,
  useConversationsQuery,
  useCreateConversationMutation,
} from "@/lib/hooks/useConversations";
import { useDocumentsQuery } from "@/lib/hooks/useDocuments";
import { formatDateGroupLabel } from "@/lib/format";

type ChatHistoryContextValue = {
  conversations: ConversationSummary[];
  groupedConversations: [string, ConversationSummary[]][];
  activeConversationId: string | null;
  activeConversationDetail: ConversationDetail | undefined;
  isActiveConversationLoading: boolean;
  setActiveConversationId: (id: string) => void;
  draft: string;
  setDraft: (value: string) => void;
  isStreaming: boolean;
  pendingUserText: string | null;
  streamingText: string;
  showNoAccessState: boolean;
  handleNewChat: () => void;
  handleSend: () => void;
};

const ChatHistoryContext = createContext<ChatHistoryContextValue | null>(
  null,
);

export const ChatHistoryProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const conversationsQuery = useConversationsQuery();
  const createConversationMutation = useCreateConversationMutation();
  const documentsQuery = useDocumentsQuery();

  const [activeConversationId, setActiveConversationIdState] = useState<
    string | null
  >(null);
  const [draft, setDraft] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingUserText, setPendingUserText] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState("");

  const activeConversationDetailQuery = useConversationQuery(
    activeConversationId,
  );

  const conversations = useMemo(
    () => conversationsQuery.data ?? [],
    [conversationsQuery.data],
  );
  const showNoAccessState =
    !documentsQuery.isLoading && (documentsQuery.data?.length ?? 0) === 0;

  const groupedConversations = useMemo(() => {
    const sorted = [...conversations].sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    const groups = new Map<string, ConversationSummary[]>();
    for (const conversation of sorted) {
      const label = formatDateGroupLabel(new Date(conversation.updatedAt));
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(conversation);
    }
    return Array.from(groups.entries());
  }, [conversations]);

  const setActiveConversationId = (id: string) => {
    setActiveConversationIdState(id);
  };

  const handleNewChat = async () => {
    const conversation = await createConversationMutation.mutateAsync(
      undefined,
    );
    setActiveConversationIdState(conversation.id);
    setDraft("");
  };

  const handleSend = async () => {
    if (!draft.trim() || isStreaming || showNoAccessState) return;

    const userText = draft.trim();
    const targetId = activeConversationId;

    setDraft("");
    setPendingUserText(userText);
    setStreamingText("");
    setIsStreaming(true);

    try {
      const result = await streamChat({
        userInput: userText,
        conversationId: targetId,
        onChunk: (chunk) => setStreamingText((prev) => prev + chunk),
      });

      const resolvedId = result.conversationId || targetId;
      if (resolvedId) {
        if (!targetId) setActiveConversationIdState(resolvedId);
        await queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.detail(resolvedId),
        });
      }
      await queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.all,
      });
    } finally {
      setIsStreaming(false);
      setPendingUserText(null);
      setStreamingText("");
    }
  };

  const value: ChatHistoryContextValue = {
    conversations,
    groupedConversations,
    activeConversationId,
    activeConversationDetail: activeConversationDetailQuery.data,
    isActiveConversationLoading: activeConversationDetailQuery.isLoading,
    setActiveConversationId,
    draft,
    setDraft,
    isStreaming,
    pendingUserText,
    streamingText,
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
