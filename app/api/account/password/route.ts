import { db } from "@/db";
import { users } from "@/db/schema";
import { requireSession } from "@/lib/auth/guard";
import { parseJsonBody } from "@/lib/http/parseJsonBody";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

const patchBodySchema = z.object({
  password: z.string().min(8),
  newPassword: z.string().min(8),
});

export async function PATCH(request: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const parsed = await parseJsonBody(request, patchBodySchema, {
    invalidBodyResponse: () =>
      NextResponse.json({ error: "Invalid password" }, { status: 400 }),
  });
  if (parsed instanceof NextResponse) return parsed;
  const { password, newPassword } = parsed;

  if (password === newPassword)
    return NextResponse.json(
      { error: "New password cannot be the same as the old password" },
      { status: 400 },
    );

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id));

  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  const newHashed = await bcrypt.hash(newPassword, 10);

  if (!user.passwordHash) {
    // add password with oauth
    await db
      .update(users)
      .set({ passwordHash: newHashed })
      .where(eq(users.id, session.user.id));
    return NextResponse.json({ message: "success" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid)
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });

  await db
    .update(users)
    .set({ passwordHash: newHashed })
    .where(eq(users.id, session.user.id));
  return NextResponse.json({ message: "success" });
}
