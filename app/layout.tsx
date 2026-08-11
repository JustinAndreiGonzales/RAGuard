import type { Metadata } from "next";
import "./globals.css";
import { auth } from "@/auth";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "RAGuard",
  description: "A permission-aware RAG chatbot.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await auth();

  return (
    <html lang="en" className={`h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}
