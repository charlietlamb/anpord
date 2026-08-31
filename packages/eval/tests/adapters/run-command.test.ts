import { describe, expect, test } from "bun:test";
import { Effect, Stream } from "effect";
import { runCommandForOutcome } from "../../src/adapters/sandbox/run-command";
import type { SandboxHandle } from "../../src/ports/sandbox";
import { exit, stderr, stdout } from "../fixtures/exec-chunk";

const sandboxSaying = (...chunks: ReturnType<typeof exit>[]) =>
  ({
    exec: () => Stream.fromIterable(chunks),
    provider: "daytona",
  }) as unknown as SandboxHandle;

describe("runCommandForOutcome", () => {
  test("reports a non-zero status instead of failing on it", async () => {
    const outcome = await Effect.runPromise(
      runCommandForOutcome(sandboxSaying(exit(128)), "git clone x")
    );

    expect(outcome.exitCode).toBe(128);
  });

  test("keeps stderr, which is where a clone says what went wrong", async () => {
    const outcome = await Effect.runPromise(
      runCommandForOutcome(
        sandboxSaying(
          stdout("Cloning into 'w'...\n"),
          stderr("fatal: could not read Username\n"),
          exit(128)
        ),
        "git clone x"
      )
    );

    expect(outcome.stderr).toBe("fatal: could not read Username\n");
  });

  test("a command that never exits is a failure, not a silent success", async () => {
    const outcome = await Effect.runPromise(
      runCommandForOutcome(sandboxSaying(stdout("working")), "x")
    );

    expect(outcome.exitCode).toBe(1);
  });

  test("reports output while the command is still running", async () => {
    const seen: string[] = [];

    await Effect.runPromise(
      runCommandForOutcome(
        sandboxSaying(stdout("resolving\n"), stdout("linking\n"), exit(0)),
        "npm ci",
        { watch: (text) => Effect.sync(() => seen.push(text)) }
      )
    );

    expect(seen.join("")).toContain("resolving");
    expect(seen.join("")).toContain("linking");
  });

  test("watching does not change what the command reports", async () => {
    const outcome = await Effect.runPromise(
      runCommandForOutcome(
        sandboxSaying(stdout("out\n"), stderr("warn\n"), exit(3)),
        "npm ci",
        { watch: () => Effect.void }
      )
    );

    expect(outcome.exitCode).toBe(3);
    expect(outcome.stdout).toContain("out");
    expect(outcome.stderr).toContain("warn");
  });
});
