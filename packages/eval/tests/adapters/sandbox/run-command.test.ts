import { expect, test } from "bun:test";
import { Effect, Stream } from "effect";
import { runCommand } from "../../../src/adapters/sandbox/run-command";
import type { SandboxHandle } from "../../../src/ports/sandbox";
import { notResumableFixture } from "../../fixtures/not-resumable";

const sandbox = (exitCode: number) =>
  ({
    exec: () => Stream.make({ at: 0, exitCode, stream: "exit" as const }),
    home: "/tmp",
    id: "sandbox",
    provider: "daytona",
    ...notResumableFixture,
    streaming: true,
    writeFile: () => Effect.void,
  }) satisfies SandboxHandle;

test("accepts a successful command", async () => {
  await Effect.runPromise(runCommand(sandbox(0), "true"));
});

test("rejects a nonzero command", async () => {
  const failure = await Effect.runPromise(
    runCommand(sandbox(7), "false").pipe(Effect.flip)
  );
  expect(failure.reason).toBe("Command exited with status 7");
});
