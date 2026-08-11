"use client";

import { useMutation } from "@tanstack/react-query";
import * as accountApi from "@/lib/api/account";

export function useUpdatePasswordMutation() {
  return useMutation({
    mutationFn: accountApi.updatePassword,
    meta: { suppressGlobalErrorToast: true },
  });
}
