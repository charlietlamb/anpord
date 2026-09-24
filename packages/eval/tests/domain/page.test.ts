import { describe, expect, it } from "bun:test";
import { EVAL_PAGE_SIZE } from "@anpord/schema/domain/evals";
import {
  MAX_PAGE_SIZE,
  nextCursor,
  pageOf,
  pageSizeOf,
} from "../../src/domain/page";

describe("pageOf", () => {
  it("reports more when the query returned the extra row", () => {
    const page = pageOf([1, 2, 3, 4], 3);

    expect(page.items).toEqual([1, 2, 3]);
    expect(page.hasMore).toBe(true);
  });

  it("reports the end when it did not", () => {
    const page = pageOf([1, 2, 3], 3);

    expect(page.items).toEqual([1, 2, 3]);
    expect(page.hasMore).toBe(false);
  });

  it("handles an empty listing", () => {
    expect(pageOf([], 25)).toEqual({ hasMore: false, items: [] });
  });
});

describe("pageSizeOf", () => {
  it("defaults when a caller asks for nothing", () => {
    expect(pageSizeOf(undefined)).toBe(EVAL_PAGE_SIZE);
  });

  it("caps a caller asking for too much", () => {
    expect(pageSizeOf(10_000)).toBe(MAX_PAGE_SIZE);
  });

  it("refuses a page of nothing, which would never advance", () => {
    expect(pageSizeOf(0)).toBe(1);
    expect(pageSizeOf(-5)).toBe(1);
  });
});

describe("nextCursor", () => {
  const cursorOf = (last: number) => ({ id: `${last}`, startedAtMillis: last });

  it("points past the last row of a full page", () => {
    expect(nextCursor(pageOf([1, 2, 3], 2), cursorOf)).toEqual({
      id: "2",
      startedAtMillis: 2,
    });
  });

  it("is null on the last page", () => {
    expect(nextCursor(pageOf([1, 2], 2), cursorOf)).toBeNull();
    expect(nextCursor(pageOf([], 2), cursorOf)).toBeNull();
  });
});
