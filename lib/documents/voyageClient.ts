const VOYAGE_API_BASE = "https://api.voyageai.com/v1";

/**
 * Shared fetch + auth-header + error-handling boilerplate for calls to the
 * Voyage AI API. Callers own the endpoint-specific request body and response
 * typing; this only owns what's truly common: the base URL, the bearer auth
 * header, and turning a non-ok response into a thrown Error.
 */
export async function voyageFetch<TResponse>(
  path: string,
  body: unknown,
  errorLabel: string,
): Promise<TResponse> {
  const res = await fetch(`${VOYAGE_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY!}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok)
    throw new Error(`${errorLabel}: ${res.status} ${await res.text()}`);

  return res.json() as Promise<TResponse>;
}
