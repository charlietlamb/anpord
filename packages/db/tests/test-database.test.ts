import { describe, expect, it } from "bun:test";
import { testDatabaseUrl } from "../src/test-database";

const pointingAt = (url: string) =>
  testDatabaseUrl({ EVAL_TEST_DATABASE_URL: url });

describe("testDatabaseUrl", () => {
  it("hands back a database named for tests or scratch work", () => {
    expect(pointingAt("postgresql://localhost:5432/anpord_test")).toBe(
      "postgresql://localhost:5432/anpord_test"
    );
    expect(pointingAt("postgresql://u@localhost/anpord_scratch_reaper")).toBe(
      "postgresql://u@localhost/anpord_scratch_reaper"
    );
    expect(pointingAt("postgres://h/anpord_migrate_test_1a2b?ssl=0")).toBe(
      "postgres://h/anpord_migrate_test_1a2b?ssl=0"
    );
  });

  it("refuses the dev database with the reason and the fix", () => {
    expect(() =>
      pointingAt("postgresql://charlielamb@localhost:5432/anpord_dev")
    ).toThrow(
      'EVAL_TEST_DATABASE_URL points at "anpord_dev", which is not a test database. Tests write and delete rows, so they only run against a database named with test or scratch, such as anpord_test or anpord_scratch_reaper.'
    );
  });

  it("refuses a hosted database and a name that only contains the word", () => {
    expect(() =>
      pointingAt("postgresql://u:p@ep-x.neon.tech/neondb?sslmode=require")
    ).toThrow('points at "neondb"');
    expect(() => pointingAt("postgresql://localhost/contest")).toThrow(
      'points at "contest"'
    );
    expect(() => pointingAt("postgresql://localhost/")).toThrow('points at ""');
  });

  it("refuses a value that is not a URL", () => {
    expect(() => pointingAt("anpord_test")).toThrow(
      "EVAL_TEST_DATABASE_URL is not a postgres URL."
    );
  });

  it("skips when unset, unless a database is required", () => {
    expect(testDatabaseUrl({})).toBeUndefined();
    expect(testDatabaseUrl({ EVAL_TEST_DATABASE_URL: "" })).toBeUndefined();
    expect(() => testDatabaseUrl({ EVAL_REQUIRE_DATABASE: "1" })).toThrow(
      "EVAL_TEST_DATABASE_URL is unset and EVAL_REQUIRE_DATABASE=1"
    );
  });

  it("never falls back to DATABASE_URL", () => {
    expect(
      testDatabaseUrl({ DATABASE_URL: "postgresql://localhost/anpord_test" })
    ).toBeUndefined();
  });
});
