import { describe, expect, it } from "bun:test";
import { cursorOf, firstPage, pageOf, popped, pushed } from "./cursor-stack";

describe("cursor stack", () => {
  it("starts before any cursor, on page one", () => {
    const stack = firstPage<string>();

    expect(cursorOf(stack)).toBeNull();
    expect(pageOf(stack)).toBe(1);
  });

  it("walks forward and back through the cursors it passed", () => {
    const forward = pushed(pushed(firstPage<string>(), "a"), "b");

    expect(cursorOf(forward)).toBe("b");
    expect(pageOf(forward)).toBe(3);

    const back = popped(forward);

    expect(cursorOf(back)).toBe("a");
    expect(pageOf(back)).toBe(2);
  });

  /** Going back from the first page would empty the stack and leave the list
   * with no position at all. */
  it("refuses to pop past the first page", () => {
    const stack = popped(firstPage<string>());

    expect(cursorOf(stack)).toBeNull();
    expect(pageOf(stack)).toBe(1);
  });

  /** Back then forward must land where it started, or a reader paging back and
   * forth would drift through the listing. */
  it("returns to the same page after going back and forward", () => {
    const start = pushed(pushed(firstPage<string>(), "a"), "b");
    const round = pushed(popped(start), "b");

    expect(round).toEqual(start);
  });
});
