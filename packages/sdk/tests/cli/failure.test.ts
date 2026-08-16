import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import { reportFailure } from "../../src/cli/failure";

const reported = (error: unknown) => {
  const written: string[] = [];
  const write = process.stderr.write.bind(process.stderr);
  process.stderr.write = ((chunk: string) => {
    written.push(chunk);
    return true;
  }) as typeof process.stderr.write;
  try {
    Effect.runSync(reportFailure(error));
    return { code: process.exitCode, text: written.join("") };
  } finally {
    process.stderr.write = write;
    process.exitCode = 0;
  }
};

describe("reporting a failure", () => {
  test("a missing key is answered with how to set one", () => {
    const { text } = reported({ _op: "MissingData", _tag: "ConfigError" });
    expect(text).toContain("ANPORD_API_KEY");
    expect(text).not.toContain("process context");
  });

  test("a rejected key says so and how to fix it", () => {
    const { text } = reported({
      _tag: "Unauthorized",
      message: "Access token is not active",
    });
    expect(text).toContain("Access token is not active");
    expect(text).toContain("ANPORD_API_KEY");
  });

  test("an api failure is reported without internals", () => {
    const { text } = reported({
      _tag: "NotFound",
      message: 'No prompt with id "missing"',
    });
    expect(text).toBe('No prompt with id "missing"\n');
  });

  test("the message is a single line, so it reads in a terminal", () => {
    const { text } = reported({ _tag: "Conflict", message: "taken" });
    expect(text.trimEnd()).not.toContain("\n");
  });

  test("a failure sets a non-zero exit code, so scripts can branch on it", () => {
    expect(reported({ _tag: "NotFound", message: "gone" }).code).toBe(1);
  });
});
