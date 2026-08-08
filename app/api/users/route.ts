import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const searchParams = request.nextUrl.searchParams;
  const email = searchParams.get("email");

  if (!email)
    return NextResponse.json({ error: "No email provided" }, { status: 400 });

  const user = await db
    .select({
      id: users.id,
      name: users.name,
    })
    .from(users)
    .where(eq(users.email, email));

  if (user.length === 0)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json(user[0]);
}
