import { describe, expect, it } from "bun:test";
import {
  stepResultsOf,
  verifyScriptOf,
  withoutMarks,
} from "../../src/domain/verify-script";

describe("rewriting a verifier to report its steps", () => {
  it("leaves a single command alone", () => {
    const script = verifyScriptOf("bun test");

    expect(script.command).toBe("bun test");
    expect(script.steps).toEqual(["bun test"]);
  });

  it("runs each condition and stops at the first that fails", () => {
    const script = verifyScriptOf("test -f a && test -f b");

    expect(script.command).toContain("{ test -f a ; }");
    expect(script.command).toContain("{ test -f b ; }");
    expect(script.command).toContain('|| exit "$__anpord_rc"');
    expect(script.command.indexOf("test -f a")).toBeLessThan(
      script.command.indexOf("test -f b")
    );
  });

  it("keeps an && inside a quoted script whole", () => {
    const step = `node -e "if (a && b) throw new Error('no')"`;

    expect(verifyScriptOf(`test -f a && ${step}`).steps).toEqual([
      "test -f a",
      step,
    ]);
  });
});

describe("reading the trail back", () => {
  const script = verifyScriptOf("test -f a && test -f b && test -f c");

  it("reads every step that ran, in order, with its exit code", () => {
    const output = [
      "",
      "@@anpord-verify 1 0",
      "some output",
      "@@anpord-verify 2 1",
      "",
    ].join("\n");

    expect(stepResultsOf(script, output)).toEqual([
      { command: "test -f a", exitCode: 0 },
      { command: "test -f b", exitCode: 1 },
    ]);
  });

  it("reports nothing for a verifier of one command", () => {
    expect(stepResultsOf(verifyScriptOf("bun test"), "bun test\n")).toEqual([]);
  });

  it("ignores a mark for a step the script does not have", () => {
    expect(stepResultsOf(script, "@@anpord-verify 9 0\n")).toEqual([]);
  });

  it("strips the marks from what the verifier printed", () => {
    expect(
      withoutMarks("hello\n@@anpord-verify 1 0\nworld\n@@anpord-verify 2 0\n")
    ).toBe("hello\nworld\n");
  });
});
