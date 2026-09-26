import { describe, expect, it } from "bun:test";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { migrationsFolder } from "../../src/migrations/folder";
import { fixtureFolder } from "./fixture-folder";

const dropping = [
  { sql: 'CREATE TABLE "a" ("id" text);', tag: "0000_add_a", when: 1000 },
  { sql: 'ALTER TABLE "a" DROP COLUMN "id";', tag: "0001_drop_id", when: 2000 },
];

describe("the migrations check", () => {
  it("fails a migration that loses data without saying so", () => {
    expect(fixtureFolder(dropping).problems()).toEqual([
      '0001_drop_id drops a column: ALTER TABLE "a" DROP COLUMN "id". If that loss is intended, add "0001_drop_id": "<what is lost and why that is fine>" to drizzle/data-loss.json. Otherwise change the schema so nothing is dropped.',
    ]);
  });

  it("passes it once data-loss.json says what is lost", () => {
    expect(
      fixtureFolder(dropping, {
        "0001_drop_id": "Nothing read a.id.",
      }).problems()
    ).toEqual([]);
  });

  it("fails an acknowledgment for a migration that does not exist", () => {
    expect(
      fixtureFolder(dropping, {
        "0001_drop_id": "Nothing read a.id.",
        "0009_gone": "Old.",
      }).problems()
    ).toEqual([
      "drizzle/data-loss.json names 0009_gone, which is not a migration. Remove it.",
    ]);
  });

  it("names a missing migration file instead of reading it", () => {
    const folder = fixtureFolder(dropping);
    rmSync(join(folder.root, "0001_drop_id.sql"));

    expect(folder.problems()).toEqual([
      "0001_drop_id is in the journal but drizzle/0001_drop_id.sql is missing.",
    ]);
  });

  it("passes the repository's own migrations", () => {
    expect(migrationsFolder().problems()).toEqual([]);
  });
});
