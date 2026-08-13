import { NextResponse } from "next/server";

/**
 * Runs an insert (or any write) and returns its result as a 201 JSON
 * response, translating a Postgres unique-violation (23505) into a 409
 * with `conflictMessage`, and any other error into a generic 500.
 */
export async function insertHandlingConflict<T>(
  insertFn: () => Promise<T>,
  conflictMessage: string,
): Promise<NextResponse> {
  try {
    const result = await insertFn();
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json({ error: conflictMessage }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "23505" /* Postgres unique_violation */
  );
}
