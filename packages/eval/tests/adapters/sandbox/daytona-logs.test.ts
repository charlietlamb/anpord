import { describe, expect, test } from "bun:test";
import { logsOf } from "../../../src/adapters/sandbox/daytona-detached";

describe("a detached command's logs", () => {
  test("reads each stream the session reported", () => {
    const logs = { stderr: "a warning", stdout: "the output" };

    expect(logsOf(logs, "stdout")).toBe("the output");
    expect(logsOf(logs, "stderr")).toBe("a warning");
  });

  test("reads an empty stream as empty rather than absent", () => {
    expect(logsOf({ stdout: "" }, "stdout")).toBe("");
  });

  /** The stream a session did not write is missing rather than empty, and the
   * journal takes a string: an absent stream reaching it as undefined is a
   * command that appears to have said nothing at all. */
  test("reads a stream the session omitted as empty", () => {
    expect(logsOf({ stdout: "only this" }, "stderr")).toBe("");
  });

  /** The SDK types this as `any`, so a shape change is a silent one. */
  test("reads a shape it does not recognise as empty", () => {
    for (const value of [null, undefined, "interleaved text", 7, []]) {
      expect(logsOf(value, "stdout")).toBe("");
    }
  });

  test("reads a stream of the wrong type as empty", () => {
    expect(logsOf({ stdout: 7 }, "stdout")).toBe("");
  });
});
