import { describe, expect, test } from "bun:test";
import { Effect, Layer } from "effect";
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
