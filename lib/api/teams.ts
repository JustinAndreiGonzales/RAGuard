import api from "./client";
import type { Team, TeamDetail } from "./types";

export async function getTeams(): Promise<Team[]> {
  const { data } = await api.get<Team[]>("/teams");
  return data;
}

export async function getTeam(id: string): Promise<TeamDetail> {
  const { data } = await api.get<TeamDetail>(`/teams/${id}`);
  return data;
}

export async function createTeam(body: {
  name: string;
}): Promise<{ id: string; name: string; createdAt: string }> {
  // Backend returns the raw `.returning()` array, not an unwrapped object.
  const { data } = await api.post(`/teams`, body);
  return data[0];
}

export async function addTeamMember(
  teamId: string,
  userId: string,
): Promise<{ teamId: string; userId: string; createdAt: string }> {
  // Same raw-array quirk as createTeam.
  const { data } = await api.post(`/teams/${teamId}/members`, { userId });
  return data[0];
}

export async function removeTeamMember(
  teamId: string,
  userId: string,
): Promise<{ success: true }> {
  const { data } = await api.delete(`/teams/${teamId}/members/${userId}`);
  return data;
}

export async function deleteTeam(id: string): Promise<{ success: true }> {
  const { data } = await api.delete(`/teams/${id}`);
  return data;
}
