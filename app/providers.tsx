"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { ReactNode, useState } from "react";
import ToastProvider from "@/components/providers/ToastProvider";
import { makeQueryClient } from "@/lib/api/queryClient";

const Providers = ({
  session,
  children,
}: {
  session: Session | null;
  children: ReactNode;
}) => {
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <SessionProvider session={session}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
};

export default Providers;
