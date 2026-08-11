"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as conversationsApi from "@/lib/api/conversations";
import { queryKeys } from "@/lib/api/queryKeys";

export function useConversationsQuery() {
  return useQuery({
    queryKey: queryKeys.conversations.all,
    queryFn: conversationsApi.getConversations,
  });
}

export function useConversationQuery(
  id: string | null,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.conversations.detail(id ?? ""),
    queryFn: () => conversationsApi.getConversation(id as string),
    enabled: !!id && (options?.enabled ?? true),
  });
}

export function useCreateConversationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (title?: string) => conversationsApi.createConversation(title),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.conversations.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
    },
  });
}
