import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
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
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsedBody = patchBodySchema.safeParse(body);
  if (!parsedBody.success)
    return NextResponse.json(
      { error: "Invalid Request Body", details: z.treeifyError(parsedBody.error) },
      { status: 400 },
    );

  const [user] = await db
    .update(users)
    .set({ role: parsedBody.data.role })
    .where(eq(users.id, id))
    .returning({ id: users.id, role: users.role });

  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json(user);
}
