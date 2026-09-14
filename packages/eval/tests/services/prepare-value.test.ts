import { describe, expect, test } from "bun:test";
import { readPrepareValue } from "../../src/services/workspace-setup";

const printed = (value: unknown) =>
  `installing\nANPORD_PREPARE_RESULT=${JSON.stringify(value)}`;

describe("what a prepare reports back", () => {
  test("is the value it printed", () => {
    expect(readPrepareValue(printed({ imageTag: "sha-abc" }))).toEqual({
      imageTag: "sha-abc",
    });
  });

  test("is the last one, when a script printed more than once", () => {
    expect(
      readPrepareValue(`${printed({ n: 1 })}\n${printed({ n: 2 })}`)
    ).toEqual({ n: 2 });
  });

  test("is empty when nothing was printed", () => {
    expect(readPrepareValue("installing\ndone")).toEqual({});
  });

  test("is empty rather than a crash when the line is not json", () => {
    expect(readPrepareValue("ANPORD_PREPARE_RESULT={oops")).toEqual({});
  });

  /* Every trial stores a copy and every reader of the run is served one, so a
     script that prints its build log through this would put it in the database
     and in an API response. */
  test("is dropped when it is too large to be a summary", () => {
    expect(readPrepareValue(printed({ log: "x".repeat(20_000) }))).toEqual({});
  });

  test("is kept when it is the size a summary actually is", () => {
    expect(readPrepareValue(printed({ log: "x".repeat(1000) }))).toEqual({
      log: "x".repeat(1000),
    });
  });
});
