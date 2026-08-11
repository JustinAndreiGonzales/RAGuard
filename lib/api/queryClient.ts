import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toastBus } from "@/lib/toast/toastBus";
import { getErrorMessage } from "./errors";

function shouldRetry(failureCount: number, error: unknown): boolean {
  // Retrying a 4xx (unauthorized/forbidden/not-found/validation) never helps —
  // it just delays the UI from ever reaching a settled error state.
  if (isAxiosError(error) && error.response) {
    const status = error.response.status;
    if (status >= 400 && status < 500) return false;
  }
  return failureCount < 1;
}

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        refetchOnWindowFocus: false,
        staleTime: 15_000,
      },
      mutations: {
        retry: 0,
      },
    },
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (query.state.data === undefined) {
          toastBus.emit({ variant: "error", message: getErrorMessage(error) });
        }
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        if (mutation.meta?.suppressGlobalErrorToast) return;
        toastBus.emit({ variant: "error", message: getErrorMessage(error) });
      },
    }),
  });
}
