import { afterAll, describe, expect, it } from "bun:test";
import { randomBytes } from "node:crypto";
import { ConfigProvider, Effect, Logger } from "effect";
import { logDatabase } from "../src/describe";
import { migrationsFolder } from "../src/migrations/folder";
import { migrate } from "../src/migrations/migrate";
import { testDatabaseUrl } from "../src/test-database";
import { scratchDatabases } from "./migrations/scratch-database";

const scratch = scratchDatabases();

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
  afterAll(() => scratch.dropAll());

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

  it("says it could not check when Postgres refuses", async () => {
    const absent = `sphynx_scratch_absent_${randomBytes(4).toString("hex")}`;
    const url = new URL(testDatabaseUrl() ?? "");
    url.pathname = `/${absent}`;

    const warnings = await warningsFor(url.toString());

    expect(warnings.map((warning) => warning.split(":")[0])).toEqual([
      `could not check migrations on ${absent}`,
    ]);
  });

  it("says nothing once it is migrated", async () => {
    const url = await scratch.create();
    await migrate(url, { confirmDataLoss: false, say: () => undefined });

    expect(await warningsFor(url)).toEqual([]);
  });
});
