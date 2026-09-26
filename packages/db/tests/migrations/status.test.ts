import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { Client } from "pg";
import { migrationsFolder, PACKAGE_ROOT } from "../../src/migrations/folder";
import { inspect } from "../../src/migrations/inspect";
import { migrate } from "../../src/migrations/migrate";
import { dryRunReport, statusReport } from "../../src/migrations/report";
import { fixtureFolder } from "./fixture-folder";
import { scratchDatabases } from "./scratch-database";

const scratch = scratchDatabases();
const quiet = () => undefined;

const addA = {
  sql: 'CREATE TABLE "a" ("id" text);',
  tag: "0000_add_a",
  when: 1000,
};
const addName = {
  sql: 'ALTER TABLE "a" ADD COLUMN "name" text;',
  tag: "0001_add_name",
  when: 2000,
};
const dropName = {
  sql: 'ALTER TABLE "a" DROP COLUMN "name";',
  tag: "0002_drop_name",
  when: 3000,
};

const query = async (url: string, sql: string) => {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    return (await client.query(sql)).rows;
  } finally {
    await client.end();
  }
};

const snapshot = (url: string) =>
  query(
    url,
    "select table_schema, table_name from information_schema.tables where table_schema in ('public', 'drizzle') order by 1, 2"
  );

const targetOf = (url: string) => {
  const parsed = new URL(url);
  return `${parsed.pathname.slice(1)} on ${parsed.host}`;
};

const script = (url: string, ...args: string[]) => {
  const ran = spawnSync(
    "bun",
    [join("scripts", args[0] ?? ""), ...args.slice(1)],
    {
      cwd: PACKAGE_ROOT,
      encoding: "utf8",
      env: { ...process.env, DATABASE_URL: url },
    }
  );
  return { code: ran.status, output: `${ran.stdout}${ran.stderr}` };
};

describe.skipIf(scratch.skip)("the status of a database", () => {
  let url = "";

  beforeEach(async () => {
    url = await scratch.create();
  });

  afterAll(() => scratch.dropAll());

  it("says an up to date database has nothing to do", async () => {
    const folder = fixtureFolder([addA, addName]);
    await migrate(url, { confirmDataLoss: false, folder, say: quiet });

    const inspection = await inspect(url, { confirmDataLoss: false, folder });

    expect(statusReport(inspection)).toBe(
      [
        `Database: ${targetOf(url)}`,
        "Applied: 2 of 2 migrations",
        "Pending: none",
        "Up to date. Migrate has nothing to do.",
      ].join("\n")
    );
    expect(inspection.problems).toEqual([]);
  });

  it("names the pending migrations of a database behind the journal", async () => {
    await migrate(url, {
      confirmDataLoss: false,
      folder: fixtureFolder([addA]),
      say: quiet,
    });

    const inspection = await inspect(url, {
      confirmDataLoss: false,
      folder: fixtureFolder([addA, addName]),
    });

    expect(statusReport(inspection)).toBe(
      [
        `Database: ${targetOf(url)}`,
        "Applied: 1 of 2 migrations",
        "Pending: 0001_add_name",
        "Migrate would apply 1 migration.",
      ].join("\n")
    );
  });

  it("names the refusal and its exact fix for a database made with push", async () => {
    await query(url, 'CREATE TABLE "a" ("id" text, "name" text)');

    const inspection = await inspect(url, {
      confirmDataLoss: false,
      folder: fixtureFolder([addA, addName]),
    });

    expect(statusReport(inspection)).toBe(
      [
        `Database: ${targetOf(url)}`,
        "Applied: 0 of 2 migrations",
        "Pending: 0000_add_a, 0001_add_name",
        "Migrate would refuse:",
        "  This database has tables but no migration history, so it was made with drizzle-kit push, and migrating would fail on tables that already exist. If it matches the current schema, run bun run db:migrate --record 0001_add_name. If it matches an older one, name that migration instead of the last. If it is local and its data does not matter, run bun run db:reset --yes.",
      ].join("\n")
    );
  });

  it("refuses pending data loss until it is confirmed", async () => {
    await migrate(url, {
      confirmDataLoss: false,
      folder: fixtureFolder([addA, addName]),
      say: quiet,
    });
    const folder = fixtureFolder([addA, addName, dropName], {
      "0002_drop_name": "Nothing reads a.name.",
    });

    const unconfirmed = await inspect(url, { confirmDataLoss: false, folder });
    const confirmed = await inspect(url, { confirmDataLoss: true, folder });

    expect(unconfirmed.problems).toEqual([
      "A pending migration loses data. Back it up with pg_dump, then run bun run db:migrate --confirm-data-loss.",
    ]);
    expect(unconfirmed.losses).toEqual([
      '0002_drop_name drops a column: ALTER TABLE "a" DROP COLUMN "name"\n    Nothing reads a.name.',
    ]);
    expect(confirmed.problems).toEqual([]);
  });

  it("exits non-zero from the command line when migrate would refuse, and zero once it would not", async () => {
    await query(url, 'CREATE TABLE "stray" ("id" text)');
    const pushed = script(url, "status.ts");
    await query(url, 'DROP TABLE "stray"');
    await migrate(url, { confirmDataLoss: false, say: quiet });
    const current = script(url, "status.ts");

    expect(pushed.code).toBe(1);
    expect(pushed.output).toContain("Migrate would refuse:");
    expect(current.code).toBe(0);
    expect(current.output).toEndWith(
      "Up to date. Migrate has nothing to do.\n"
    );
  });
});

describe.skipIf(scratch.skip)("a dry run", () => {
  let url = "";

  beforeEach(async () => {
    url = await scratch.create();
  });

  afterAll(() => scratch.dropAll());

  it("lists the pending SQL and its data loss, and writes nothing", async () => {
    await migrate(url, {
      confirmDataLoss: false,
      folder: fixtureFolder([addA, addName]),
      say: quiet,
    });
    const folder = fixtureFolder([addA, addName, dropName], {
      "0002_drop_name": "Nothing reads a.name.",
    });
    const before = await snapshot(url);
    const history = await query(
      url,
      "select * from drizzle.__drizzle_migrations"
    );

    const report = dryRunReport(
      await inspect(url, { confirmDataLoss: false, folder })
    );

    expect(report).toBe(
      [
        `Dry run against ${targetOf(url)}. Nothing was written.`,
        "Pending SQL, in order:",
        "  packages/db/drizzle/0002_drop_name.sql",
        "Data loss in pending migrations:",
        '  0002_drop_name drops a column: ALTER TABLE "a" DROP COLUMN "name"',
        "    Nothing reads a.name.",
        "Migrate would refuse:",
        "  A pending migration loses data. Back it up with pg_dump, then run bun run db:migrate --confirm-data-loss.",
      ].join("\n")
    );
    expect(await snapshot(url)).toEqual(before);
    expect(
      await query(url, "select * from drizzle.__drizzle_migrations")
    ).toEqual(history);
    expect(
      await query(
        url,
        "select column_name from information_schema.columns where table_name = 'a' order by 1"
      )
    ).toEqual([{ column_name: "id" }, { column_name: "name" }]);
  });

  it("leaves an empty database empty from the command line", async () => {
    const ran = script(url, "migrate.ts", "--dry-run");

    expect(ran.code).toBe(0);
    expect(ran.output).toContain(
      "  packages/db/drizzle/0000_unusual_hellfire_club.sql\n"
    );
    expect(ran.output).toContain(
      `Migrate would apply ${migrationsFolder().journal().entries.length} migrations.`
    );
    expect(await snapshot(url)).toEqual([]);
  });
});
