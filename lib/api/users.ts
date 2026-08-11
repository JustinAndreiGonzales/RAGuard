import { isAxiosError } from "axios";
import api from "./client";
import type { Me, Role, UserListItem, UserSummary } from "./types";

export async function getUsers(): Promise<UserListItem[]> {
  const { data } = await api.get<UserListItem[]>("/users");
  return data;
}

export async function getUserByEmail(
  email: string,
): Promise<UserSummary | null> {
  try {
    const { data } = await api.get<UserSummary>("/users", {
      params: { email },
    });
    return data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

export async function getMe(): Promise<Me> {
  const { data } = await api.get<Me>("/users/me");
  return data;
}

export async function updateUserRole(
  id: string,
  role: Role,
): Promise<{ id: string; role: Role }> {
  const { data } = await api.patch(`/users/${id}/role`, { role });
  return data;
}
