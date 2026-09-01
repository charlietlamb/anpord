import { describe, expect, test } from "bun:test";
import { Effect, Exit, Stream } from "effect";
import type { ExecChunk, SandboxHandle } from "../../src/ports/sandbox";
import { SuspenderSleeping } from "../../src/services/resumable-command";
import { runPrepare } from "../../src/services/workspace-setup";

const sandboxSaying = (exitCode: number, stdout: string, stderr = "") => {
  const commands: string[] = [];
  const environments: (Readonly<Record<string, string>> | undefined)[] = [];

  const sandbox = {
    exec: (command: string) => {
      commands.push(command);

      return Stream.fromIterable<ExecChunk>([
        {
          at: 0,
          data: command.startsWith("rm") ? "" : stdout,
          stream: "stdout",
        },
        { at: 0, data: stderr, stream: "stderr" },
        {
          at: 0,
          exitCode: command.startsWith("rm") ? 0 : exitCode,
          stream: "exit",
        },
      ]);
    },
    home: "/home/agent",
    id: "test",
    provider: "daytona",
    progress: () => Effect.succeed({ exitCode, stderr, stdout }),
    start: (
      command: string,
      options?: { readonly env?: Readonly<Record<string, string>> }
    ) =>
      Effect.sync(() => {
        commands.push(command);
        environments.push(options?.env);

        return { id: "cmd", session: "session" };
      }),
    streaming: false,
    writeFile: () => Effect.void,
  } as unknown as SandboxHandle;

  return { commands, environments, sandbox };
};

const run = (sandbox: SandboxHandle) =>
  runPrepare({
    sandbox,
    prepare: { name: "prepareRepoImage", source: "export {}" },
    workspace: "/tmp/ws",
  }).pipe(Effect.provide(SuspenderSleeping));

describe("running a workspace setup", () => {
  test("reads back what the setup returned", async () => {
    const { sandbox } = sandboxSaying(
      0,
      'ANPORD_PREPARE_RESULT={"rendererPort":4173}\n'
    );

    expect(await Effect.runPromise(run(sandbox))).toEqual({
      rendererPort: 4173,
    });
  });

  test("a setup that returns nothing still succeeds", async () => {
    const { sandbox } = sandboxSaying(0, "built\n");

    expect(await Effect.runPromise(run(sandbox))).toEqual({});
  });

  test("removes the script whether or not the setup worked", async () => {
    const { commands, sandbox } = sandboxSaying(1, "", "npm ci failed");

    await Effect.runPromiseExit(run(sandbox));

    expect(commands.some((command) => command.startsWith("rm -f"))).toBe(true);
  });

  test("a failure carries what the setup wrote, not just its status", async () => {
    const { sandbox } = sandboxSaying(1, "", "npm ci failed\n");

    const exit = await Effect.runPromiseExit(run(sandbox));

    expect(Exit.isFailure(exit)).toBe(true);
    expect(JSON.stringify(exit)).toContain("npm ci failed");
  });

  test("restores before the prepare runs, and tells it so", async () => {
    const { environments, sandbox } = sandboxSaying(0, "");
    const asked: string[] = [];

    await Effect.runPromise(
      runPrepare({
        caseCache: { key: "deps-abc", path: "vendor" },
        prepare: { name: "prepareRepoImage", source: "export {}" },
        sandbox: {
          ...sandbox,
          cache: {
            has: () => Effect.succeed(true),
            restore: (key: string) =>
              Effect.sync(() => {
                asked.push(key);
                return true;
              }),
            save: () => Effect.void,
          },
        },
        workspace: "/tmp/ws",
      }).pipe(Effect.provide(SuspenderSleeping))
    );

    expect(asked).toEqual(["deps-abc"]);
    expect(environments[0]?.ANPORD_CACHE_RESTORED).toBe("1");
  });

  test("does not claim a restore that did not happen", async () => {
    const { environments, sandbox } = sandboxSaying(0, "");

    await Effect.runPromise(
      runPrepare({
        caseCache: { key: "deps-abc", path: "vendor" },
        prepare: { name: "prepareRepoImage", source: "export {}" },
        sandbox: {
          ...sandbox,
          cache: {
            has: () => Effect.succeed(false),
            restore: () => Effect.succeed(false),
            save: () => Effect.void,
          },
        },
        workspace: "/tmp/ws",
      }).pipe(Effect.provide(SuspenderSleeping))
    );

    expect(environments[0]?.ANPORD_CACHE_RESTORED).toBeUndefined();
  });

  /* Caching what a failed install left behind is how a broken cache outlives
     the run that made it. */
  test("saves nothing when the prepare failed", async () => {
    const saved: string[] = [];
    const { sandbox } = sandboxSaying(1, "npm ci failed");

    await Effect.runPromise(
      Effect.exit(
        runPrepare({
          prepare: { name: "prepareRepoImage", source: "export {}" },
          sandbox: {
            ...sandbox,
            cache: {
              has: () => Effect.succeed(false),
              restore: () => Effect.succeed(false),
              save: (key: string) =>
                Effect.sync(() => {
                  saved.push(key);
                }),
            },
          },
          workspace: "/tmp/ws",
        }).pipe(Effect.provide(SuspenderSleeping))
      )
    );

    expect(saved).toEqual([]);
  });

  test("says nothing about a cache when the provider has none", async () => {
    const { environments, sandbox } = sandboxSaying(0, "");

    await Effect.runPromise(run(sandbox));

    expect(environments[0]).toBeUndefined();
  });
});
