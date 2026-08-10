"use client";

import { signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode } from "react";
import GeneralLayout from "@/components/layout/general";
import { ChatHistoryProvider } from "./ChatHistoryContext";
import ChatSidebarHistory from "./ChatSidebarHistory";

type NavKey = "chat" | "documents" | "teams";

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

  const activeNav: NavKey = pathname.startsWith("/documents")
    ? "documents"
    : pathname.startsWith("/teams")
      ? "teams"
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
        onSignOutClick={() => signOut({ callbackUrl: "/login" })}
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
