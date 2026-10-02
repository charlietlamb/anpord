import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { Client } from "pg";
import { MigrationRefused } from "../../src/migrations/inspect";
import { migrate } from "../../src/migrations/migrate";
import { fixtureFolder } from "./fixture-folder";
import { scratchDatabases } from "./scratch-database";

const scratch = scratchDatabases();
const quiet = () => undefined;

const additive = [
  { sql: 'CREATE TABLE "a" ("id" text);', tag: "0000_add_a", when: 1000 },
  {
    sql: 'ALTER TABLE "a" ADD COLUMN "name" text;--> statement-breakpoint\nCREATE INDEX "a_name_idx" ON "a" ("name");',
    tag: "0001_add_name",
    when: 2000,
  },
];

const dropping = [
  ...additive,
  {
    sql: 'ALTER TABLE "a" DROP COLUMN "name";',
    tag: "0002_drop_name",
    when: 3000,
  },
];

const query = async (url: string, sql: string) => {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    return (await client.query(sql)).rows;
  } finally {
    await client.end();
  }
};

const refusal = (run: Promise<unknown>) =>
  run.then(
    () => "applied",
    (cause: unknown) =>
      cause instanceof MigrationRefused ? cause.message : String(cause)
  );

describe.skipIf(scratch.skip)("migrating a real database", () => {
  let url = "";

  beforeEach(async () => {
    url = await scratch.create();
  });

  afterAll(() => scratch.dropAll());

  it("applies the repository's migrations from nothing, then a rerun changes nothing", async () => {
    const first = await migrate(url, { confirmDataLoss: false, say: quiet });
    const started = performance.now();
    const again = await migrate(url, { confirmDataLoss: false, say: quiet });
    const rerunMillis = performance.now() - started;

    expect(first.applied.length).toBeGreaterThan(57);
    expect(again.applied).toEqual([]);
    expect(rerunMillis).toBeLessThan(500);
    const [recorded] = await query(
      url,
      "select count(*)::int as n from drizzle.__drizzle_migrations"
    );
    expect(recorded?.n).toBe(first.applied.length);
  });

  it("records each migration under its journal date", async () => {
    await migrate(url, {
      confirmDataLoss: false,
      folder: fixtureFolder(additive),
      say: quiet,
    });

    expect(
      await query(
        url,
        "select created_at::int as at from drizzle.__drizzle_migrations order by id"
      )
    ).toEqual([{ at: 1000 }, { at: 2000 }]);
  });

  it("refuses a database made with push, then records it on request", async () => {
    await query(url, 'CREATE TABLE "a" ("id" text, "name" text)');
    const folder = fixtureFolder(additive);

    const refused = await refusal(
      migrate(url, { confirmDataLoss: false, folder, say: quiet })
    );
    const recorded = await migrate(url, {
      confirmDataLoss: false,
      folder,
      record: "0001_add_name",
      say: quiet,
    });

    expect(refused).toStartWith("sphynx_migrate_test_");
    expect(refused).toContain("was made with drizzle-kit push");
    expect(recorded.applied).toEqual([]);
    expect(
      await query(
        url,
        "select created_at::int as at from drizzle.__drizzle_migrations order by id"
      )
    ).toEqual([{ at: 1000 }, { at: 2000 }]);
  });

  it("refuses to lose data until told to, and keeps the column meanwhile", async () => {
    await migrate(url, {
      confirmDataLoss: false,
      folder: fixtureFolder(additive),
      say: quiet,
    });
    const folder = fixtureFolder(dropping, {
      "0002_drop_name": "Nothing reads a.name.",
    });

    const refused = await refusal(
      migrate(url, { confirmDataLoss: false, folder, say: quiet })
    );
    const columnsBefore = await query(
      url,
      "select column_name from information_schema.columns where table_name = 'a' order by column_name"
    );
    const confirmed = await migrate(url, {
      confirmDataLoss: true,
      folder,
      say: quiet,
    });

    expect(refused).toEndWith(
      'would lose data:\n  0002_drop_name drops a column: ALTER TABLE "a" DROP COLUMN "name"\n    Nothing reads a.name.\nBack it up with pg_dump, then run bun run db:migrate --confirm-data-loss.'
    );
    expect(columnsBefore).toEqual([
      { column_name: "id" },
      { column_name: "name" },
    ]);
    expect(confirmed.applied).toEqual(["0002_drop_name"]);
  });

  it("applies nothing when one pending migration fails", async () => {
    const folder = fixtureFolder([
      ...additive,
      {
        sql: 'ALTER TABLE "missing" ADD COLUMN "x" text;',
        tag: "0002_broken",
        when: 3000,
      },
    ]);

    const refused = await refusal(
      migrate(url, { confirmDataLoss: false, folder, say: quiet })
    );

    expect(refused).toBe(
      '0002_broken failed: relation "missing" does not exist. Nothing was changed.'
    );
    expect(
      await query(url, "select to_regclass('public.a') is null as absent")
    ).toEqual([{ absent: true }]);
  });

  it("refuses a journal that is out of order before touching the database", async () => {
    const folder = fixtureFolder([
      { sql: 'CREATE TABLE "a" ("id" text);', tag: "0000_add_a", when: 2000 },
      { sql: 'CREATE TABLE "b" ("id" text);', tag: "0001_add_b", when: 1000 },
    ]);

    const refused = await refusal(
      migrate(url, { confirmDataLoss: false, folder, say: quiet })
    );

    expect(refused).toStartWith(
      "The migrations folder is not safe to apply:\n  0001_add_b is dated 1970-01-01T00:00:01.000Z, no later than 0000_add_a"
    );
    expect(
      await query(
        url,
        "select to_regclass('drizzle.__drizzle_migrations') is null as absent"
      )
    ).toEqual([{ absent: true }]);
  });
});
