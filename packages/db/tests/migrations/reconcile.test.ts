import { describe, expect, it } from "bun:test";
import { type Migration, reconcile } from "../../src/migrations/reconcile";

const migration = (tag: string, when: number): Migration => ({
  hash: `hash-${tag}`,
  sql: "",
  tag,
  when,
});

const first = migration("0000_first", 1000);
const second = migration("0001_second", 2000);
const third = migration("0002_third", 3000);
const all = [first, second, third];

const recordOf = (applied: Migration) => ({
  createdAt: applied.when,
  hash: applied.hash,
});

describe("reconciling a database with the journal", () => {
  it("leaves the migrations after the last recorded one pending", () => {
    const state = reconcile(all, [recordOf(first)], false);

    expect(state.pending.map((row) => row.tag)).toEqual([
      "0001_second",
      "0002_third",
    ]);
    expect(state.problems).toEqual([]);
  });

  it("has nothing pending once every migration is recorded", () => {
    const state = reconcile(all, all.map(recordOf), false);

    expect(state.pending).toEqual([]);
    expect(state.applied.map((row) => row.tag)).toEqual([
      "0000_first",
      "0001_second",
      "0002_third",
    ]);
  });

  it("refuses a database made with push", () => {
    expect(reconcile(all, [], true).problems).toEqual([
      "This database has tables but no migration history, so it was made with drizzle-kit push, and migrating would fail on tables that already exist. If it matches the current schema, run bun run db:migrate --record 0002_third. If it matches an older one, name that migration instead of the last. If it is local and its data does not matter, run bun run db:reset --yes.",
    ]);
  });

  it("refuses a migration this checkout does not have", () => {
    expect(
      reconcile(
        all,
        [recordOf(first), { createdAt: 1500, hash: "elsewhere" }],
        false
      ).problems
    ).toEqual([
      "This database has a migration from 1970-01-01T00:00:01.500Z that this checkout does not. It was applied from another branch. Check out or merge that branch, then migrate again.",
    ]);
  });

  it("refuses a migration recorded under a date the journal has since changed", () => {
    expect(
      reconcile(
        all,
        [recordOf(first), { createdAt: 1800, hash: second.hash }],
        false
      ).problems
    ).toEqual([
      "This database recorded 0001_second as 1800, but the journal now dates it 2000, so drizzle would run it again. Fix the record with: update drizzle.__drizzle_migrations set created_at = 2000 where hash = 'hash-0001_second';",
    ]);
  });

  it("refuses a gap drizzle would skip", () => {
    expect(
      reconcile(all, [recordOf(first), recordOf(third)], false).problems
    ).toEqual([
      "0001_second never ran here, but 0002_third after it did, so drizzle would skip it for good. If the database already has its changes, record it with bun run db:migrate --record 0001_second. Otherwise apply drizzle/0001_second.sql with psql first, then record it.",
    ]);
  });

  it("notes a migration edited after it ran without refusing", () => {
    const state = reconcile(
      all,
      [{ createdAt: first.when, hash: "older" }, recordOf(second)],
      false
    );

    expect(state.edited.map((row) => row.tag)).toEqual(["0000_first"]);
    expect(state.problems).toEqual([]);
    expect(state.pending.map((row) => row.tag)).toEqual(["0002_third"]);
  });
});
