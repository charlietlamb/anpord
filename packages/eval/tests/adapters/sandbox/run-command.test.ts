import { expect, test } from "bun:test";
import { Effect, Stream } from "effect";
import { runCommand } from "../../../src/adapters/sandbox/run-command";
import type { SandboxHandle } from "../../../src/ports/sandbox";
import { declinesEverything } from "../../fixtures/declines-everything";

const sandbox = (exitCode: number) =>
  ({
    exec: () => Stream.make({ at: 0, exitCode, stream: "exit" as const }),
    home: "/tmp",
    id: "sandbox",
    provider: "daytona",
    ...declinesEverything,
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

test("says why a command failed when it wrote to stderr", async () => {
  const failing = {
    ...sandbox(190),
    exec: () =>
      Stream.make(
        {
          at: 0,
          data: "npm error code ENOTEMPTY\nnpm error rename failed\n",
          stream: "stderr" as const,
        },
        { at: 1, exitCode: 190, stream: "exit" as const }
      ),
  } satisfies SandboxHandle;

  const failure = await Effect.runPromise(
    runCommand(failing, "npm i -g codex").pipe(Effect.flip)
  );

  expect(failure.reason).toBe(
    "Command exited with status 190: npm error code ENOTEMPTY\nnpm error rename failed"
  );
});
