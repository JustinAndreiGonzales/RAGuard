"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as teamsApi from "@/lib/api/teams";
import { queryKeys } from "@/lib/api/queryKeys";

export function useTeamsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.teams.all,
    queryFn: teamsApi.getTeams,
    enabled: options?.enabled ?? true,
  });
}

export function useTeamQuery(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.teams.detail(id ?? ""),
    queryFn: () => teamsApi.getTeam(id as string),
    enabled: !!id,
  });
}

export function useCreateTeamMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: teamsApi.createTeam,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });
    },
  });
}

export function useAddTeamMemberMutation(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => teamsApi.addTeamMember(teamId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.teams.detail(teamId),
      });
    },
  });
}

export function useRemoveTeamMemberMutation(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => teamsApi.removeTeamMember(teamId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.teams.detail(teamId),
      });
    },
  });
}

export function useDeleteTeamMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: teamsApi.deleteTeam,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });
    },
  });
}
