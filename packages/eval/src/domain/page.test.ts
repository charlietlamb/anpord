import { describe, expect, it } from "bun:test";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, pageOf, pageSizeOf } from "./page";

describe("pageOf", () => {
  /** The query asks for one more row than the page holds, so a full page and a
   * last page are told apart without a second count query. */
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
    expect(pageSizeOf(undefined)).toBe(DEFAULT_PAGE_SIZE);
  });

  /** A request for ten thousand rows is a request to hold ten thousand rows in
   * memory, so the ceiling is the server's rather than the caller's. */
  it("caps a caller asking for too much", () => {
    expect(pageSizeOf(10_000)).toBe(MAX_PAGE_SIZE);
  });

  it("refuses a page of nothing, which would never advance", () => {
    expect(pageSizeOf(0)).toBe(1);
    expect(pageSizeOf(-5)).toBe(1);
  });
});
