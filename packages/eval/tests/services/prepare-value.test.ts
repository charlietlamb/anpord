import { describe, expect, test } from "bun:test";
import { prepareValueOf } from "../../src/services/workspace-setup";

const printed = (value: unknown) =>
  `installing\nANPORD_PREPARE_RESULT=${JSON.stringify(value)}`;

describe("what a prepare reports back", () => {
  test("is the value it printed", () => {
    expect(
      prepareValueOf(printed({ cache: null, value: { imageTag: "sha-abc" } }))
        .value
    ).toEqual({ imageTag: "sha-abc" });
  });

  test("is the last one, when a script printed more than once", () => {
    expect(
      prepareValueOf(
        `${printed({ value: { n: 1 } })}\n${printed({ value: { n: 2 } })}`
      ).value
    ).toEqual({ n: 2 });
  });

  test("is empty when nothing was printed", () => {
    expect(prepareValueOf("installing\ndone").value).toEqual({});
  });

  test("is empty rather than a crash when the line is not json", () => {
    expect(prepareValueOf("ANPORD_PREPARE_RESULT={oops").value).toEqual({});
  });

  test("is dropped when it is too large to be a summary", () => {
    expect(
      prepareValueOf(printed({ value: { log: "x".repeat(20_000) } })).value
    ).toEqual({});
  });
});

describe("the directory a prepare asks to keep", () => {
  test("is carried when the prepare named one", () => {
    expect(
      prepareValueOf(
        printed({ cache: { key: "deps-abc", path: "node_modules" } })
      ).cache
    ).toEqual({ key: "deps-abc", path: "node_modules" });
  });

  test("is absent when it named none", () => {
    expect(prepareValueOf(printed({ value: {} })).cache).toBeNull();
  });

  /* Joined onto the workspace before it is archived, so a path that climbs out
     of it would have the runner save somewhere else entirely. */
  test("is refused when it climbs out of the workspace", () => {
    expect(
      prepareValueOf(printed({ cache: { key: "k", path: "../../etc" } })).cache
    ).toBeNull();
  });

  test("is refused when it is absolute", () => {
    expect(
      prepareValueOf(printed({ cache: { key: "k", path: "/etc" } })).cache
    ).toBeNull();
  });

  test("is refused when it is not the shape it should be", () => {
    expect(
      prepareValueOf(printed({ cache: { key: 7, path: "node_modules" } })).cache
    ).toBeNull();
  });
});
