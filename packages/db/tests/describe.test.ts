import { afterAll, describe, expect, it } from "bun:test";
import { ConfigProvider, Effect, Logger } from "effect";
import { logDatabase } from "../src/describe";
import { migrationsFolder } from "../src/migrations/folder";
import { migrate } from "../src/migrations/migrate";
import { scratchDatabases } from "./migrations/scratch-database";

const scratch = scratchDatabases();

afterAll(() => scratch.dropAll());

const warningsFor = async (url: string) => {
  const warnings: string[] = [];
  await Effect.runPromise(
    logDatabase.pipe(
      Effect.withConfigProvider(
        ConfigProvider.fromMap(new Map([["DATABASE_URL", url]]))
      ),
      Effect.provide(
        Logger.replace(
          Logger.defaultLogger,
          Logger.make(({ logLevel, message }) => {
            if (logLevel._tag === "Warning") {
              warnings.push(String(message));
            }
          })
        )
      )
    )
  );
  return warnings;
};

describe.skipIf(scratch.skip)("a local database at boot", () => {
  it("names the migrations it is missing", async () => {
    const url = await scratch.create();
    const name = new URL(url).pathname.slice(1);
    const tags = migrationsFolder()
      .migrations()
      .map((migration) => migration.tag);

    expect(await warningsFor(url)).toEqual([
      `database ${name} is missing ${tags.length} migrations (${tags.join(", ")}). Run bun run db:migrate.`,
    ]);
  });

  it("says nothing once it is migrated", async () => {
    const url = await scratch.create();
    await migrate(url, { confirmDataLoss: false, say: () => undefined });

    expect(await warningsFor(url)).toEqual([]);
  });
});
