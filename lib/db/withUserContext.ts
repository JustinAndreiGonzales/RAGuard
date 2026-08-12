import { sql } from "drizzle-orm";
import { rlsDb } from "@/db/rls-client";

type RlsTransaction = Parameters<Parameters<typeof rlsDb.transaction>[0]>[0];

export async function withUserContext<T>(
  userId: string,
  isAdmin: boolean,
  fn: (tx: RlsTransaction) => Promise<T>,
): Promise<T> {
  return rlsDb.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT set_config('app.current_user_id', ${userId}, true)`,
    );
    await tx.execute(
      sql`SELECT set_config('app.current_user_is_admin', ${isAdmin ? "true" : "false"}, true)`,
    );
    await tx.execute(sql`SET LOCAL hnsw.iterative_scan = 'strict_order'`);
    return fn(tx);
  });
}
