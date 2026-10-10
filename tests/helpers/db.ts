import { AsyncLocalStorage } from "node:async_hooks";
import { PGlite } from "@electric-sql/pglite";
export const db = new PGlite();
const context = new AsyncLocalStorage<any>();
function result(r: any) {
  return { ...r, rowCount: r.rows.length || r.affectedRows || 0 };
}
export async function sql<T = any>(
  query: string,
  params?: any[],
): Promise<T[]> {
  return (await (context.getStore() || db).query(query, params)).rows as T[];
}
export async function sqlOne<T = any>(
  query: string,
  params?: any[],
): Promise<T | null> {
  return (await sql<T>(query, params))[0] || null;
}
export async function transaction<T>(fn: (client: any) => Promise<T>) {
  const active = context.getStore();
  if (active)
    return fn({
      query: async (q: string, p?: any[]) => result(await active.query(q, p)),
    });
  return db.transaction(async (tx) =>
    context.run(tx, () =>
      fn({
        query: async (q: string, p?: any[]) => result(await tx.query(q, p)),
      }),
    ),
  );
}
