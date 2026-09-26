import { describe, expect, it } from "bun:test";
import {
  type Journal,
  journalProblems,
  withOrderedLastEntry,
} from "../../src/migrations/journal";

const entry = (idx: number, tag: string, when: number) => ({
  breakpoints: true,
  idx,
  tag,
  version: "7",
  when,
});

const journalOf = (...entries: ReturnType<typeof entry>[]): Journal => ({
  dialect: "postgresql",
  entries,
  version: "7",
});

describe("the journal check", () => {
  it("passes a journal whose dates rise and whose files all exist", () => {
    const journal = journalOf(
      entry(0, "0000_first", 1000),
      entry(1, "0001_second", 2000)
    );

    expect(
      journalProblems(journal, ["0000_first.sql", "0001_second.sql"])
    ).toEqual([]);
  });

  it("names a migration dated before the one it follows, and the date to give it", () => {
    const journal = journalOf(
      entry(0, "0000_first", 1_790_900_000_005),
      entry(1, "0001_second", 1_790_458_276_734)
    );

    expect(
      journalProblems(journal, ["0000_first.sql", "0001_second.sql"])
    ).toEqual([
      {
        kind: "misdated",
        message:
          '0001_second is dated 2026-09-26T21:31:16.734Z, no later than 0000_first at 2026-10-02T00:13:20.005Z, so drizzle would skip it on any database that has 0000_first. Set its "when" in drizzle/meta/_journal.json to 1790900000006.',
      },
    ]);
  });

  it("refuses two migrations with the same date", () => {
    const journal = journalOf(
      entry(0, "0000_first", 1000),
      entry(1, "0001_second", 1000)
    );

    expect(
      journalProblems(journal, ["0000_first.sql", "0001_second.sql"]).map(
        (problem) => problem.kind
      )
    ).toEqual(["misdated"]);
  });

  it("names a reused tag, a missing file and a file the journal never runs", () => {
    const journal = journalOf(
      entry(0, "0000_first", 1000),
      entry(1, "0000_first", 2000)
    );

    expect(
      journalProblems(journal, ["0000_first.sql", "0002_stray.sql"])
    ).toEqual([
      {
        kind: "misnamed",
        message:
          "0000_first is entry 1 of the journal, so its name should start with 0001_ and use only lowercase letters, digits and underscores.",
      },
      { kind: "repeated", message: "0000_first is in the journal twice." },
      {
        kind: "unlisted-file",
        message:
          "drizzle/0002_stray.sql is not in the journal, so it never runs. Delete it and run bun run db:generate.",
      },
    ]);
  });
});

describe("a newly generated entry", () => {
  it("moves after the entry before it when the clock says earlier", () => {
    const generated = journalOf(
      entry(0, "0000_first", 1_790_900_000_005),
      entry(1, "0001_second", 1_790_458_276_734)
    );

    expect(
      withOrderedLastEntry(generated).entries.map((row) => row.when)
    ).toEqual([1_790_900_000_005, 1_790_900_000_006]);
  });

  it("keeps its own date when it is already the latest", () => {
    const generated = journalOf(
      entry(0, "0000_first", 1000),
      entry(1, "0001_second", 5000)
    );

    expect(
      withOrderedLastEntry(generated).entries.map((row) => row.when)
    ).toEqual([1000, 5000]);
  });
});
