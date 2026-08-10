import { redirect } from "next/navigation";
import { ReactNode } from "react";
import { auth } from "@/auth";
import { getInitials } from "@/lib/format";
import AppShellClient from "./_components/AppShellClient";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { name, email, role } = session.user;

  return (
    <AppShellClient
      role={role}
      userName={name ?? email ?? "Unknown"}
      userEmail={email ?? ""}
      userInitials={getInitials(name ?? email)}
    >
      {children}
    </AppShellClient>
  );
}
