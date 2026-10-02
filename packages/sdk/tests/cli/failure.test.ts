import { describe, expect, test } from "bun:test";
import { HttpClientError, HttpClientRequest } from "@effect/platform";
import { Effect } from "effect";
import { EvalGateFailed, EvalRunFailed } from "../../src/cli/eval-gate";
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
  test("a server it cannot reach is named, with how to fix it", () => {
    const { code, text } = reported(
      new HttpClientError.RequestError({
        cause: new Error("getaddrinfo ENOTFOUND api.sphynx.test"),
        reason: "Transport",
        request: HttpClientRequest.post(
          "https://api.sphynx.test/v1/connectors.list"
        ),
      })
    );
    expect(text).toBe(
      "Unable to reach Sphynx at https://api.sphynx.test. Check your network connection, or set SPHYNX_BASE_URL if your Sphynx server is at another address.\n"
    );
    expect(code).toBe(1);
  });

  test("a missing key is answered with how to set one", () => {
    const { text } = reported({ _op: "MissingData", _tag: "ConfigError" });
    expect(text).toContain("SPHYNX_API_KEY");
    expect(text).not.toContain("process context");
  });

  test("a rejected key says so and how to fix it", () => {
    const { text } = reported({
      _tag: "Unauthorized",
      message: "Access token is not active",
    });
    expect(text).toContain("Access token is not active");
    expect(text).toContain("SPHYNX_API_KEY");
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

  test("a failed gate exits 2, apart from errors", () => {
    expect(reported(new EvalGateFailed({ problems: ["a failed"] })).code).toBe(
      2
    );
  });

  test("a batch that could not run exits 1", () => {
    expect(reported(new EvalRunFailed({ problems: ["timed out"] })).code).toBe(
      1
    );
  });
});
