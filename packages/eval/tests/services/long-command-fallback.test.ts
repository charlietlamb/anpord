import { describe, expect, test } from "bun:test";
import { Effect, Layer, Stream } from "effect";
import type { ExecChunk, SandboxHandle } from "../../src/ports/sandbox";
import { runLongCommand } from "../../src/services/long-command";
import { Suspender } from "../../src/services/suspender";
import { declinesEverything } from "../fixtures/declines-everything";

/* A suspender that fails if anything reaches for it: nothing should, because a
   provider that cannot resume never polls. */
const Unreachable = Layer.succeed(
  Suspender,
  Suspender.of({ waitFor: () => Effect.die("a streamed command never waits") })
);

const streamingSandbox = (chunks: readonly ExecChunk[]) => {
  const seen = {
    commands: [] as string[],
    options: [] as (Record<string, unknown> | undefined)[],
  };

  const sandbox = {
    ...declinesEverything,
    exec: (command: string, options?: Record<string, unknown>) => {
      seen.commands.push(command);
      seen.options.push(options);

      return Stream.fromIterable(chunks);
    },
    home: "/home/agent",
    id: "sandbox-1",
    provider: "daytona",
    writeFile: () => Effect.void,
  } as unknown as SandboxHandle;

  return { sandbox, seen };
};

const run = (
  sandbox: SandboxHandle,
  watch?: (text: string) => Effect.Effect<void>
) =>
  Effect.runPromise(
    runLongCommand(sandbox, "npm ci", {
      cwd: "/tmp/ws",
      env: { ANPORD_CACHE_RESTORED: "1" },
      timeoutMs: 1_800_000,
      watch,
    }).pipe(Effect.provide(Unreachable))
  );

describe("a provider that cannot resume a command", () => {
  test("runs it streamed rather than failing outright", async () => {
    const { sandbox } = streamingSandbox([
      { at: 0, data: "installing\n", stream: "stdout" },
      { at: 1, data: "a warning\n", stream: "stderr" },
      { at: 2, exitCode: 0, stream: "exit" },
    ]);

    expect(await run(sandbox)).toEqual({
      exitCode: 0,
      stderr: "a warning\n",
      stdout: "installing\n",
    });
  });

  test("reports a non-zero exit as the command's own failure", async () => {
    const { sandbox } = streamingSandbox([
      { at: 0, data: "ENOENT missing lockfile\n", stream: "stderr" },
      { at: 1, exitCode: 7, stream: "exit" },
    ]);

    const outcome = await run(sandbox);

    expect(outcome.exitCode).toBe(7);
    expect(outcome.stderr).toContain("ENOENT missing lockfile");
  });

  test("hands the command the cwd, env and deadline it was given", async () => {
    const { sandbox, seen } = streamingSandbox([
      { at: 0, exitCode: 0, stream: "exit" },
    ]);

    await run(sandbox);

    expect(seen.commands).toEqual(["npm ci"]);
    expect(seen.options[0]).toMatchObject({
      cwd: "/tmp/ws",
      env: { ANPORD_CACHE_RESTORED: "1" },
      timeoutMs: 1_800_000,
    });
  });

  test("still calls the watcher, from the stream rather than a poll", async () => {
    const { sandbox } = streamingSandbox([
      { at: 0, data: "step one\n", stream: "stdout" },
      { at: 1, data: "step two\n", stream: "stdout" },
      { at: 2, exitCode: 0, stream: "exit" },
    ]);

    const watched: string[] = [];

    await run(sandbox, (text) =>
      Effect.sync(() => {
        watched.push(text);
      })
    );

    expect(watched.join("")).toContain("step one");
    expect(watched.join("")).toContain("step two");
  });

  test("keeps the tail of a chatty command rather than all of it", async () => {
    const { sandbox } = streamingSandbox([
      { at: 0, data: "x".repeat(50_000), stream: "stdout" },
      { at: 1, data: "ENOSPC\n", stream: "stdout" },
      { at: 2, exitCode: 1, stream: "exit" },
    ]);

    const outcome = await run(sandbox);

    expect(outcome.stdout.length).toBeLessThan(50_000);
    expect(outcome.stdout).toContain("ENOSPC");
  });
});
