"use client";

import { useMutation } from "@tanstack/react-query";
import * as authApi from "@/lib/api/auth";

export function useRegisterMutation() {
  return useMutation({
    mutationFn: authApi.registerUser,
    meta: { suppressGlobalErrorToast: true },
  });
}
