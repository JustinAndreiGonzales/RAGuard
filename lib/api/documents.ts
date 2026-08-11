import type { AxiosProgressEvent } from "axios";
import api from "./client";
import type {
  DocumentChunksResponse,
  DocumentDetail,
  DocumentListItem,
  DocumentPermission,
  PrincipalType,
  Visibility,
} from "./types";

export async function getDocuments(): Promise<DocumentListItem[]> {
  const { data } = await api.get<DocumentListItem[]>("/documents");
  return data;
}

export async function getDocument(id: string): Promise<DocumentDetail> {
  const { data } = await api.get<DocumentDetail>(`/documents/${id}`);
  return data;
}

export async function uploadDocument({
  file,
  visibility,
  onUploadProgress,
}: {
  file: File;
  visibility?: Visibility;
  onUploadProgress?: (event: AxiosProgressEvent) => void;
}): Promise<{ documentId: string; status: "pending" | "failed" }> {
  const formData = new FormData();
  formData.append("file", file);
  if (visibility) formData.append("visibility", visibility);

  const { data } = await api.post("/documents/upload", formData, {
    onUploadProgress,
  });
  return data;
}

export async function deleteDocument(id: string): Promise<{ success: true }> {
  const { data } = await api.delete(`/documents/${id}`);
  return data;
}

export async function getDocumentChunks(
  id: string,
  params: { limit: number; offset: number },
): Promise<DocumentChunksResponse> {
  const { data } = await api.get(`/documents/${id}/chunks`, { params });
  return data;
}

export async function getDocumentPermissions(
  id: string,
): Promise<DocumentPermission[]> {
  const { data } = await api.get(`/documents/${id}/permissions`);
  return data;
}

export async function grantDocumentPermission(
  id: string,
  body: { principalType: PrincipalType; principalId: string },
): Promise<DocumentPermission> {
  const { data } = await api.post(`/documents/${id}/permissions`, body);
  return data;
}

export async function revokeDocumentPermission(
  id: string,
  permissionId: string,
): Promise<{ success: true }> {
  const { data } = await api.delete(
    `/documents/${id}/permissions/${permissionId}`,
  );
  return data;
}
