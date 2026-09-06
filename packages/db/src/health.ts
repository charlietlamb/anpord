import { sql } from "drizzle-orm";
import { Effect } from "effect";
import { Database } from "./client";

export const pingDatabase = Effect.gen(function* () {
  const db = yield* Database;
  yield* Effect.tryPromise(() => db.execute(sql`select 1`));
}).pipe(Effect.withSpan("Database.ping"));
