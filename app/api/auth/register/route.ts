import { db } from "@/db";
import { users } from "@/db/schema";
import { parseJsonBody } from "@/lib/http/parseJsonBody";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

const signUpSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const parsed = await parseJsonBody(request, signUpSchema);
  if (parsed instanceof NextResponse) return parsed;

  const { email, password, name } = parsed;

  try {
    const existing = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existing)
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 },
      );

    const hashed = await bcrypt.hash(password, 10);
    const [user] = await db
      .insert(users)
      .values({
        email: email,
        name: name,
        passwordHash: hashed,
        role: "user",
      })
      .returning({ id: users.id, email: users.email });

    return NextResponse.json(user, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
