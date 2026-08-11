"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosProgressEvent } from "axios";
import * as documentsApi from "@/lib/api/documents";
import { queryKeys } from "@/lib/api/queryKeys";
import type { DocumentListItem, PrincipalType, Visibility } from "@/lib/api/types";

const LIVE_STATUSES = new Set(["pending", "processing"]);

function hasLiveDocuments(docs: DocumentListItem[] | undefined) {
  return docs?.some((d) => LIVE_STATUSES.has(d.status)) ?? false;
}

export function useDocumentsQuery() {
  return useQuery({
    queryKey: queryKeys.documents.all,
    queryFn: documentsApi.getDocuments,
    refetchInterval: (query) =>
      hasLiveDocuments(query.state.data) ? 4000 : false,
  });
}

export function useDocumentQuery(
  id: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.documents.detail(id ?? ""),
    queryFn: () => documentsApi.getDocument(id as string),
    enabled: !!id && (options?.enabled ?? true),
    refetchInterval: (query) =>
      LIVE_STATUSES.has(query.state.data?.status ?? "") ? 2000 : false,
  });
}

export function useUploadDocumentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      file: File;
      visibility?: Visibility;
      onUploadProgress?: (event: AxiosProgressEvent) => void;
    }) => documentsApi.uploadDocument(vars),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
    },
  });
}

export function useDeleteDocumentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => documentsApi.deleteDocument(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
      queryClient.removeQueries({ queryKey: queryKeys.documents.detail(id) });
    },
  });
}

export function useDocumentChunksQuery(
  id: string,
  params: { limit: number; offset: number },
) {
  return useQuery({
    queryKey: queryKeys.documents.chunks(id, params),
    queryFn: () => documentsApi.getDocumentChunks(id, params),
    enabled: !!id,
  });
}

export function useDocumentPermissionsQuery(id: string | null) {
  return useQuery({
    queryKey: queryKeys.documents.permissions(id ?? ""),
    queryFn: () => documentsApi.getDocumentPermissions(id as string),
    enabled: !!id,
  });
}

export function useGrantPermissionMutation(documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { principalType: PrincipalType; principalId: string }) =>
      documentsApi.grantDocumentPermission(documentId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.documents.permissions(documentId),
      });
    },
  });
}

export function useRevokePermissionMutation(documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (permissionId: string) =>
      documentsApi.revokeDocumentPermission(documentId, permissionId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.documents.permissions(documentId),
      });
    },
  });
}
