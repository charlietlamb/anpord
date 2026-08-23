import { describe, expect, it } from "bun:test";
import { pageOf } from "../../src/domain/page";

/** Two runs started in the same millisecond. A cursor holding only a timestamp
 * cannot say which of them a page ended on, so it either repeats one or loses
 * one -- which is why the id travels with it. */
type Cursor = { readonly id: string; readonly startedAtMillis: number } | null;

interface Row {
  readonly createdAt: Date;
  readonly id: string;
}

const sameMoment: readonly Row[] = [
  { createdAt: new Date(1000), id: "run_c" },
  { createdAt: new Date(1000), id: "run_b" },
  { createdAt: new Date(1000), id: "run_a" },
];

const after = (rows: readonly Row[], cursor: Cursor): readonly Row[] =>
  cursor === null
    ? rows
    : rows.filter(
        (row) =>
          row.createdAt.getTime() < cursor.startedAtMillis ||
          (row.createdAt.getTime() === cursor.startedAtMillis &&
            row.id < cursor.id)
      );

/* Walks the whole listing a page at a time, returning what a reader would
   have seen in the order they saw it. */
const walk = (rows: readonly Row[], size: number): readonly string[] => {
  const step = (cursor: Cursor, seen: readonly string[]): readonly string[] => {
    const page = pageOf(after(rows, cursor), size);
    const last = page.items.at(-1);

    if (last === undefined) {
      return seen;
    }

    const next = [...seen, ...page.items.map((row) => row.id)];

    return page.hasMore
      ? step({ id: last.id, startedAtMillis: last.createdAt.getTime() }, next)
      : next;
  };

  return step(null, []);
};

describe("keyset pagination", () => {
  it("walks rows that share a timestamp without repeating one", () => {
    const seen = walk(sameMoment, 1);

    expect(seen).toEqual(["run_c", "run_b", "run_a"]);
    expect(new Set(seen).size).toBe(seen.length);
  });

  /** The property offset pagination cannot hold: a row inserted between two
   * fetches shifts every page after it, so a reader sees one row twice and
   * never sees another. A cursor names a position instead of a count. */
  it("is unmoved by a row inserted while a reader pages", () => {
    const first = pageOf(sameMoment, 1);
    const last = first.items.at(-1);

    if (last === undefined) {
      throw new Error("expected a first page");
    }

    const cursor = { id: last.id, startedAtMillis: last.createdAt.getTime() };
    const grown = [{ createdAt: new Date(9000), id: "run_new" }, ...sameMoment];

    expect(after(grown, cursor).map((row) => row.id)).toEqual([
      "run_b",
      "run_a",
    ]);
  });
});
