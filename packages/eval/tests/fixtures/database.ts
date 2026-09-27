import { DatabaseLive } from "@anpord/db/client";
import { DatabaseConfig } from "@anpord/db/config";
import { testDatabaseUrl } from "@anpord/db/test-database";
import { Duration, Layer, Redacted } from "effect";

const databaseUrl = testDatabaseUrl();

export const skipWithoutDatabase = () => databaseUrl === undefined;

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
