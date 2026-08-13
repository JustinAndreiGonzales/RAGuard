import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin, requireSession } from "@/lib/auth/guard";
import { parseJsonBody } from "@/lib/http/parseJsonBody";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

const patchBodySchema = z.object({
  role: z.enum(["admin", "user"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const forbidden = requireAdmin(session);
  if (forbidden) return forbidden;

  const { id } = await params;

  const idSchema = z.uuid();

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  if (session.user.id === id) {
    return NextResponse.json(
      { error: "Cannot change your own role" },
      { status: 400 },
    );
  }

  const parsedBody = await parseJsonBody(request, patchBodySchema);
  if (parsedBody instanceof NextResponse) return parsedBody;

  const [user] = await db
    .update(users)
    .set({ role: parsedBody.role })
    .where(eq(users.id, id))
    .returning({ id: users.id, role: users.role });

  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json(user);
}
