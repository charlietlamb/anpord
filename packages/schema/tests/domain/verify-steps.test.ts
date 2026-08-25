import { describe, expect, it } from "bun:test";
import { readingOf, stepsOf, summaryOf } from "../../src/domain/verify-steps";

describe("reading a verifier as steps", () => {
  it.each([
    ["a single command", "node --test", ["node --test"]],
    ["two conditions", "test -f a && test -f b", ["test -f a", "test -f b"]],
    ["padding around the joiner", "a   &&   b", ["a", "b"]],
    ["a trailing joiner", "a && ", ["a"]],
  ])("reads %s", (_label, command, expected) => {
    expect(stepsOf(command)).toEqual(expected);
  });

  /* The reason this is not a split on "&&": a verifier that checks a
     condition inside a script would otherwise be torn in half and shown as
     two steps that each run nothing. */
  it("keeps an && inside a quoted script whole", () => {
    const step = `node -e "if (a && b) throw new Error('no')"`;

    expect(stepsOf(step)).toEqual([step]);
  });

  it("keeps a || fallback with the step it belongs to", () => {
    expect(stepsOf("test -f a || exit 1 && test -f b")).toEqual([
      "test -f a || exit 1",
      "test -f b",
    ]);
  });
});

describe("naming a step", () => {
  it("uses the message it throws", () => {
    expect(
      summaryOf(
        `node -e "if(Array.isArray(n))throw new Error('navigation must be an object')"`
      )
    ).toBe("navigation must be an object");
  });

  it("drops the join left by a concatenated message", () => {
    expect(
      summaryOf(`node -e "throw new Error('too many tabs: ' + tabs.length)"`)
    ).toBe("too many tabs");
  });

  it.each([
    ["test -f docs/docs.json", "docs/docs.json exists"],
    ["test -d docs", "docs is a directory"],
    ["test ! -f  stray.md", "stray.md is absent"],
    ["test -s out.txt", "out.txt is not empty"],
    ['grep -q "<svg" public/logo.svg', "public/logo.svg contains <svg"],
    ["! grep -q TODO README.md", "README.md does not contain TODO"],
  ])("reads %s as a condition", (step, expected) => {
    expect(summaryOf(step)).toBe(expected);
  });

  it("falls back to the command when nothing is thrown", () => {
    expect(summaryOf("node --test")).toBe("node --test");
  });

  it("keeps a long command to one line", () => {
    expect(summaryOf("x".repeat(200))).toHaveLength(73);
  });
});

describe("reading a step by kind", () => {
  it("knows a thrown message from what it checks", () => {
    expect(readingOf("node -e \"throw new Error('too many tabs')\"")).toEqual({
      kind: "message",
      text: "too many tabs",
    });
  });

  it("knows a condition from an idiom", () => {
    expect(readingOf("test -f a.json")).toEqual({
      kind: "condition",
      text: "a.json exists",
    });
  });

  it("keeps a command whole", () => {
    const long = `grep -rq '${"x".repeat(100)}' docs`;

    expect(readingOf(long)).toEqual({ kind: "command", text: long });
  });
});
