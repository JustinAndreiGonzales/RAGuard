"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as usersApi from "@/lib/api/users";
import { queryKeys } from "@/lib/api/queryKeys";
import type { Role } from "@/lib/api/types";

export function useUsersQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.users.all,
    queryFn: usersApi.getUsers,
    enabled: options?.enabled ?? true,
  });
}

export function useUserByEmailQuery(
  email: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.users.byEmail(email),
    queryFn: () => usersApi.getUserByEmail(email),
    enabled: (options?.enabled ?? true) && email.length > 0,
    retry: false,
  });
}

export function useMeQuery() {
  return useQuery({
    queryKey: queryKeys.users.me,
    queryFn: usersApi.getMe,
  });
}

export function useUpdateUserRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) =>
      usersApi.updateUserRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}
