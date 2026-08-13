import { auth } from "@/auth";
import type { Session } from "next-auth";
import { NextResponse } from "next/server";

export type AuthedSession = Session & { user: NonNullable<Session["user"]> };

/**
 * Resolves the current session, or returns a 401 NextResponse if there
 * isn't one. Call sites should do:
 *
 *   const session = await requireSession();
 *   if (session instanceof NextResponse) return session;
 */
export async function requireSession(): Promise<AuthedSession | NextResponse> {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  return session as AuthedSession;
}

/**
 * Checks that an already-resolved session belongs to an admin, returning a
 * 403 NextResponse otherwise (or null when the check passes). Call sites
 * should do:
 *
 *   const forbidden = requireAdmin(session);
 *   if (forbidden) return forbidden;
 */
export function requireAdmin(session: AuthedSession): NextResponse | null {
  if (session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}
