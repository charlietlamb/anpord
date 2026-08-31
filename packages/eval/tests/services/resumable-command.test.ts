import { describe, expect, test } from "bun:test";
import { Duration, Effect, Layer, TestClock, TestContext } from "effect";
import type { SandboxHandle } from "../../src/ports/sandbox";
import { runResumable, Suspender } from "../../src/services/resumable-command";

const Immediate = Layer.succeed(
  Suspender,
  Suspender.of({ waitFor: () => Effect.void })
);

const sandboxFinishingAfter = (checks: number) => {
  const seen = { checks: 0, starts: 0 };

  const sandbox = {
    id: "sandbox-1",
    progress: () =>
      Effect.sync(() => {
        seen.checks += 1;

        return seen.checks >= checks
          ? { exitCode: 0, stderr: "", stdout: "done\n" }
          : { exitCode: null, stderr: "", stdout: "working\n" };
      }),
    start: () =>
      Effect.sync(() => {
        seen.starts += 1;

        return { id: "cmd", session: "session" };
      }),
  } as unknown as SandboxHandle;

  return { sandbox, seen };
};

const run = (sandbox: SandboxHandle) =>
  Effect.runPromise(
    runResumable(sandbox, "npm ci").pipe(Effect.provide(Immediate))
  );

describe("running a command that outlives a suspension", () => {
  test("starts the command once, however often it is checked", async () => {
    const { sandbox, seen } = sandboxFinishingAfter(4);

    await run(sandbox);

    expect(seen.starts).toBe(1);
    expect(seen.checks).toBe(4);
  });

  test("reports what the command finally wrote", async () => {
    const { sandbox } = sandboxFinishingAfter(2);

    expect(await run(sandbox)).toEqual({
      exitCode: 0,
      stderr: "",
      stdout: "done\n",
    });
  });

  test("a command already finished is not waited on", async () => {
    const { sandbox, seen } = sandboxFinishingAfter(1);

    await run(sandbox);

    expect(seen.checks).toBe(1);
  });
});

/* Never exits, which is the case the loop had no answer for: a wedged install
   waiting on input polls until something else stops the sandbox. */
const sandboxThatNeverFinishes = () =>
  ({
    id: "sandbox-1",
    progress: () =>
      Effect.succeed({ exitCode: null, stderr: "", stdout: "working\n" }),
    start: () => Effect.succeed({ id: "cmd", session: "session" }),
  }) as unknown as SandboxHandle;

/* Advances the clock by what it was asked to wait, so the deadline is reached
   by polling rather than by the test sleeping. */
const Advancing = Layer.succeed(
  Suspender,
  Suspender.of({ waitFor: (duration) => TestClock.adjust(duration) })
);

describe("a command that never exits", () => {
  test("gives up at its deadline rather than polling forever", async () => {
    const outcome = await Effect.runPromise(
      runResumable(sandboxThatNeverFinishes(), "npm ci", {
        timeoutMs: Duration.toMillis(Duration.minutes(2)),
      }).pipe(
        Effect.provide(Advancing),
        Effect.provide(TestContext.TestContext)
      )
    );

    expect(outcome.exitCode).toBe(1);
    expect(outcome.stderr).toContain("timed out");
  });

  test("keeps what it printed before the deadline", async () => {
    const outcome = await Effect.runPromise(
      runResumable(sandboxThatNeverFinishes(), "npm ci", {
        timeoutMs: Duration.toMillis(Duration.minutes(2)),
      }).pipe(
        Effect.provide(Advancing),
        Effect.provide(TestContext.TestContext)
      )
    );

    expect(outcome.stdout).toContain("working");
  });
});

/* Every poll returns the whole log from byte zero, so what a long install
   printed accumulates rather than streams past. */
const sandboxPrinting = (output: string) =>
  ({
    id: "sandbox-1",
    progress: () =>
      Effect.succeed({ exitCode: 0, stderr: output, stdout: output }),
    start: () => Effect.succeed({ id: "cmd", session: "session" }),
  }) as unknown as SandboxHandle;

describe("what a resumable command reports", () => {
  test("keeps the tail rather than the whole log", async () => {
    const outcome = await Effect.runPromise(
      runResumable(sandboxPrinting("x".repeat(50_000)), "npm ci").pipe(
        Effect.provide(Immediate)
      )
    );

    expect(outcome.stdout.length).toBeLessThan(50_000);
    expect(outcome.stderr.length).toBeLessThan(50_000);
  });

  test("keeps the end, which is where a command says what went wrong", async () => {
    const outcome = await Effect.runPromise(
      runResumable(
        sandboxPrinting(`${"x".repeat(50_000)}ENOENT missing lockfile`),
        "npm ci"
      ).pipe(Effect.provide(Immediate))
    );

    expect(outcome.stdout).toContain("ENOENT missing lockfile");
  });
});
