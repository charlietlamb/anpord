import { describe, expect, test } from "bun:test";
import {
  Duration,
  Effect,
  Layer,
  Option,
  TestClock,
  TestContext,
} from "effect";
import { SandboxUnavailable } from "../../src/domain/errors";
import type {
  CommandProgress,
  ResumableCommands,
  SandboxHandle,
} from "../../src/ports/sandbox";
import { runLongCommand } from "../../src/services/long-command";
import { Suspender } from "../../src/services/suspender";
import { declinesEverything } from "../fixtures/declines-everything";

const Immediate = Layer.succeed(
  Suspender,
  Suspender.of({ waitFor: () => Effect.void })
);

const resuming = (resumable: Partial<ResumableCommands>): SandboxHandle =>
  ({
    ...declinesEverything,
    id: "sandbox-1",
    resumable: Option.some({
      progress: () => Effect.succeed({} as CommandProgress),
      start: () => Effect.succeed({ id: "cmd", session: "session" }),
      ...resumable,
    }),
  }) as unknown as SandboxHandle;

const sandboxFinishingAfter = (checks: number) => {
  const seen = { checks: 0, starts: 0 };

  const sandbox = resuming({
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
  });

  return { sandbox, seen };
};

const run = (sandbox: SandboxHandle) =>
  Effect.runPromise(
    runLongCommand(sandbox, "npm ci").pipe(Effect.provide(Immediate))
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
  resuming({
    progress: () =>
      Effect.succeed({ exitCode: null, stderr: "", stdout: "working\n" }),
  });

/* Advances the clock by what it was asked to wait, so the deadline is reached
   by polling rather than by the test sleeping. */
const Advancing = Layer.succeed(
  Suspender,
  Suspender.of({ waitFor: (duration) => TestClock.adjust(duration) })
);

const givingUp = () =>
  Effect.runPromise(
    runLongCommand(sandboxThatNeverFinishes(), "npm ci", {
      timeoutMs: Duration.toMillis(Duration.minutes(2)),
    }).pipe(Effect.provide(Advancing), Effect.provide(TestContext.TestContext))
  );

describe("a command that never exits", () => {
  test("gives up at its deadline rather than polling forever", async () => {
    const outcome = await givingUp();

    expect(outcome.exitCode).toBe(1);
    expect(outcome.stderr).toContain("timed out");
  });

  test("keeps what it printed before the deadline", async () => {
    const outcome = await givingUp();

    expect(outcome.stdout).toContain("working");
  });
});

/* Every poll returns the whole log from byte zero, so what a long install
   printed accumulates rather than streams past. */
const sandboxPrinting = (output: string) =>
  resuming({
    progress: () =>
      Effect.succeed({ exitCode: 0, stderr: output, stdout: output }),
  });

describe("what a long command reports", () => {
  test("keeps the tail rather than the whole log", async () => {
    const outcome = await Effect.runPromise(
      runLongCommand(sandboxPrinting("x".repeat(50_000)), "npm ci").pipe(
        Effect.provide(Immediate)
      )
    );

    expect(outcome.stdout.length).toBeLessThan(50_000);
    expect(outcome.stderr.length).toBeLessThan(50_000);
  });

  test("keeps the end, which is where a command says what went wrong", async () => {
    const outcome = await Effect.runPromise(
      runLongCommand(
        sandboxPrinting(`${"x".repeat(50_000)}ENOENT missing lockfile`),
        "npm ci"
      ).pipe(Effect.provide(Immediate))
    );

    expect(outcome.stdout).toContain("ENOENT missing lockfile");
  });
});

/* Fails the given number of checks before reporting, the way a provider does
   when it is briefly unavailable. */
const sandboxFailingChecks = (failures: number) => {
  const seen = { checks: 0 };

  const sandbox = resuming({
    progress: () =>
      Effect.suspend(() => {
        seen.checks += 1;

        return seen.checks <= failures
          ? Effect.fail(
              new SandboxUnavailable({ provider: "daytona", reason: "503" })
            )
          : Effect.succeed({ exitCode: 0, stderr: "", stdout: "done\n" });
      }),
  });

  return { sandbox, seen };
};

/* The retry schedule sleeps on the real clock rather than through the
   suspender, so these run against a shortened one. */
const quickly = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(Effect.provide(Immediate), Effect.timeout(Duration.seconds(30)));

describe("a check that fails on the way", () => {
  test("does not discard the command over one bad response", async () => {
    const { sandbox, seen } = sandboxFailingChecks(2);

    const outcome = await Effect.runPromise(
      quickly(runLongCommand(sandbox, "npm ci"))
    );

    expect(outcome.exitCode).toBe(0);
    expect(seen.checks).toBeGreaterThan(2);
  });

  test("gives up once the provider is not briefly unavailable", async () => {
    const { sandbox } = sandboxFailingChecks(99);

    const outcome = await Effect.runPromise(
      quickly(runLongCommand(sandbox, "npm ci")).pipe(Effect.either)
    );

    expect(outcome._tag).toBe("Left");
  });
});
