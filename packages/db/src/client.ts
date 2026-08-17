import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Context, Duration, Effect, Layer, Redacted } from "effect";
import { Pool } from "pg";
import { DatabaseConfig } from "./config";
import { schema } from "./schema";

export class Database extends Context.Tag("@anpord/db/Database")<
  Database,
  NodePgDatabase<typeof schema>
>() {}

export const DatabaseLive = Layer.scoped(
  Database,
  Effect.gen(function* () {
    const config = yield* DatabaseConfig;
    const pool = yield* Effect.acquireRelease(
      Effect.sync(() => {
        const created = new Pool({
          connectionString: Redacted.value(config.url),
          max: config.poolMax,
          idleTimeoutMillis: 30_000,
          connectionTimeoutMillis: 10_000,
          keepAlive: true,
          /** Postgres cancels the query itself rather than the caller merely
           * giving up on it, so a slow statement releases its pool slot instead
           * of holding one until every slot is taken. */
          statement_timeout: Duration.toMillis(config.statementTimeout),
        });

        created.on("error", (cause) => {
          Effect.runFork(
            Effect.logWarning("idle database connection dropped").pipe(
              Effect.annotateLogs({ cause: String(cause) })
            )
          );
        });

        return created;
      }),
      (created) => Effect.promise(() => created.end()).pipe(Effect.orDie)
    );

    return drizzle(pool, { schema });
  })
);
