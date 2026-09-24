import { DatabaseLive } from "@anpord/db/client";
import { DatabaseConfig } from "@anpord/db/config";
import { Duration, Layer, Redacted } from "effect";

const REQUIRED = process.env.EVAL_REQUIRE_DATABASE === "1";

const databaseUrl = process.env.EVAL_TEST_DATABASE_URL;

export const skipWithoutDatabase = () => {
  if (databaseUrl === undefined && REQUIRED) {
    throw new Error(
      "EVAL_TEST_DATABASE_URL is unset and EVAL_REQUIRE_DATABASE=1, so these tests would have skipped silently"
    );
  }

  return databaseUrl === undefined;
};

export const testDatabase = (poolMax = 4) =>
  DatabaseLive.pipe(
    Layer.provide(
      Layer.succeed(DatabaseConfig, {
        poolMax,
        statementTimeout: Duration.seconds(30),
        url: Redacted.make(databaseUrl ?? ""),
      })
    )
  );
