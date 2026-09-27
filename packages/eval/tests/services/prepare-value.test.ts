import { describe, expect, test } from "bun:test";
import { Either } from "effect";
import { readPrepareValue } from "../../src/domain/prepare-output";

const printed = (value: unknown) =>
  `installing\nANPORD_PREPARE_RESULT=${JSON.stringify(value)}`;

describe("what a prepare reports back", () => {
  test("is the value it printed", () => {
    expect(readPrepareValue(printed({ imageTag: "sha-abc" }))).toEqual(
      Either.right({ imageTag: "sha-abc" })
    );
  });

  test("is the last one, when a script printed more than once", () => {
    expect(
      readPrepareValue(`${printed({ n: 1 })}\n${printed({ n: 2 })}`)
    ).toEqual(Either.right({ n: 2 }));
  });

  test("is kept when it is the size a summary actually is", () => {
    expect(readPrepareValue(printed({ log: "x".repeat(1000) }))).toEqual(
      Either.right({ log: "x".repeat(1000) })
    );
  });

  test.each([
    ["nothing was printed", "installing\ndone", "printed no result"],
    ["the line is not json", "ANPORD_PREPARE_RESULT={oops", "not valid JSON"],
    ["it is not an object", printed(["a"]), "other than an object"],
    [
      "it is too large to be a summary",
      printed({ log: "x".repeat(20_000) }),
      "the limit is 16000",
    ],
  ])("fails the setup when %s", (_, output, reason) => {
    const read = readPrepareValue(output);
    expect(Either.isLeft(read) && read.left.includes(reason)).toBe(true);
  });
});
