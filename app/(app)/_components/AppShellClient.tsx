"use client";

import { useQueryClient } from "@tanstack/react-query";
import { signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode } from "react";
import GeneralLayout from "@/components/layout/general";
import { ChatHistoryProvider } from "./ChatHistoryContext";
import ChatSidebarHistory from "./ChatSidebarHistory";

type NavKey = "chat" | "documents" | "teams" | "users";

type AppShellClientProps = {
  role: "admin" | "user";
  userName: string;
  userEmail: string;
  userInitials: string;
  children: ReactNode;
};

const ROUTE_BY_NAV: Record<NavKey, string> = {
  chat: "/",
  documents: "/documents",
  teams: "/teams",
  users: "/admin/users",
};

const AppShellClient = ({
  role,
  userName,
  userEmail,
  userInitials,
  children,
}: AppShellClientProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();

  const activeNav: NavKey = pathname.startsWith("/documents")
    ? "documents"
    : pathname.startsWith("/teams")
      ? "teams"
      : pathname.startsWith("/admin/users")
        ? "users"
        : "chat";

  return (
    <ChatHistoryProvider>
      <GeneralLayout
        activeNav={activeNav}
        onNavigate={(nav) => router.push(ROUTE_BY_NAV[nav])}
        role={role}
        userName={userName}
        userEmail={userEmail}
        userInitials={userInitials}
        onAccountClick={() => router.push("/account")}
        onSignOutClick={() => {
          queryClient.clear();
          signOut({ callbackUrl: "/login" });
        }}
        sidebarContent={
          activeNav === "chat" ? <ChatSidebarHistory /> : undefined
        }
      >
        {children}
      </GeneralLayout>
    </ChatHistoryProvider>
  );
};

export default AppShellClient;
