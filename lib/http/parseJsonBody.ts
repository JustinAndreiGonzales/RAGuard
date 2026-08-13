import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * Parses and validates a request's JSON body against a zod schema.
 *
 *   const parsed = await parseJsonBody(request, mySchema);
 *   if (parsed instanceof NextResponse) return parsed;
 *   const data = parsed;
 *
 * On a JSON parse failure this returns a 400 with `{ error: "Invalid JSON" }`.
 * On a schema validation failure it returns a 400 with
 * `{ error: "Invalid Request Body", details: <treeified zod error> }` by
 * default; pass `invalidBodyResponse` to produce a different response body
 * for that case (matching a call site's pre-existing behavior).
 */
export async function parseJsonBody<T>(
  request: NextRequest,
  schema: z.ZodType<T>,
  options?: {
    invalidBodyResponse?: (error: z.ZodError) => NextResponse;
  },
): Promise<T | NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    if (options?.invalidBodyResponse) return options.invalidBodyResponse(parsed.error);
    return NextResponse.json(
      { error: "Invalid Request Body", details: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  return parsed.data;
}
