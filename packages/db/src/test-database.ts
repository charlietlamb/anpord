import { Duration, Layer, Redacted } from "effect";
import { DatabaseLive } from "./client";
import { DatabaseConfig } from "./config";

type Env = Readonly<Record<string, string | undefined>>;

const DISPOSABLE_NAME = /(^|[_-])(test|scratch)([_-]|$)/;

const databaseNameIn = (url: string) => {
  try {
    return decodeURIComponent(new URL(url).pathname.slice(1));
  } catch {
    throw new Error(
      "EVAL_TEST_DATABASE_URL is not a postgres URL. Set it to a test database, such as postgresql://localhost:5432/anpord_test."
    );
  }
};

export const testDatabaseUrl = (env: Env = process.env) => {
  const url = env.EVAL_TEST_DATABASE_URL || undefined;

  if (url === undefined) {
    if (env.EVAL_REQUIRE_DATABASE === "1") {
      throw new Error(
        "EVAL_TEST_DATABASE_URL is unset and EVAL_REQUIRE_DATABASE=1, so these tests would have skipped silently"
      );
    }
    return;
  }

  const name = databaseNameIn(url);

  if (!DISPOSABLE_NAME.test(name)) {
    throw new Error(
      `EVAL_TEST_DATABASE_URL points at "${name}", which is not a test database. Tests write and delete rows, so they only run against a database named with test or scratch, such as anpord_test or anpord_scratch_reaper.`
    );
  }

  return url;
};

export const skipWithoutDatabase = () => testDatabaseUrl() === undefined;

export const testDatabase = ({
  poolMax = 4,
  statementTimeout = Duration.seconds(30),
}: {
  readonly poolMax?: number;
  readonly statementTimeout?: Duration.Duration;
} = {}) =>
  DatabaseLive.pipe(
    Layer.provide(
      Layer.succeed(DatabaseConfig, {
        poolMax,
        statementTimeout,
        url: Redacted.make(testDatabaseUrl() ?? ""),
      })
    )
  );
