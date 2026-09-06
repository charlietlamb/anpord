import { Config, Context, Duration, Layer } from "effect";
import type { Redacted } from "effect/Redacted";

/* Long enough for a keyset page with a search, short enough that a stuck query returns its pool slot. */
const STATEMENT_TIMEOUT_DEFAULT = Duration.seconds(10);

export interface DatabaseConfigShape {
  readonly poolMax: number;
  readonly statementTimeout: Duration.Duration;
  readonly url: Redacted<string>;
}

export class DatabaseConfig extends Context.Tag("@anpord/db/DatabaseConfig")<
  DatabaseConfig,
  DatabaseConfigShape
>() {}

export const DatabaseConfigLive = Layer.effect(
  DatabaseConfig,
  Config.all({
    url: Config.redacted("DATABASE_URL"),
    poolMax: Config.integer("DATABASE_POOL_MAX").pipe(Config.withDefault(8)),
    statementTimeout: Config.duration("DATABASE_STATEMENT_TIMEOUT").pipe(
      Config.withDefault(STATEMENT_TIMEOUT_DEFAULT)
    ),
  })
);
