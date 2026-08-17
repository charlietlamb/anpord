import { sql } from "drizzle-orm";
import { Effect } from "effect";
import { Database } from "./client";

/**
 * The cheapest question that still proves the connection works: it reaches
 * Postgres, so a bad URL, an exhausted pool, or an unreachable host all fail,
 * while costing nothing to answer.
 */
export const pingDatabase = Effect.gen(function* () {
  const db = yield* Database;
  yield* Effect.tryPromise(() => db.execute(sql`select 1`));
}).pipe(Effect.withSpan("Database.ping"));
