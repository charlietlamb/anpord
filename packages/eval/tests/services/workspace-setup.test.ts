import { describe, expect, test } from "bun:test";
import { Effect, Exit, Option, Stream } from "effect";
import type { ExecChunk, SandboxHandle } from "../../src/ports/sandbox";
import { SuspenderSleeping } from "../../src/services/suspender";
import { runPrepare } from "../../src/services/workspace-setup";
import { declinesEverything } from "../fixtures/declines-everything";

/* Both paths a prepare can take, run against the same assertions: a provider
   that resumes is polled, and one that does not is streamed. Five of six
   providers are the second kind, which is the case that used to fail
   outright. */
const sandboxSaying = (exitCode: number, stdout: string, stderr = "") => {
  const commands: string[] = [];
  const environments: (Readonly<Record<string, string>> | undefined)[] = [];

  const record = (
    command: string,
    options?: { readonly env?: Readonly<Record<string, string>> }
  ) => {
    commands.push(command);
    environments.push(options?.env);
  };

  const streamed: SandboxHandle = {
    ...declinesEverything,
    exec: (command, options) => {
      record(command, options);

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
    writeFile: () => Effect.void,
  };

  const polled: SandboxHandle = {
    ...streamed,
    /* The cleanup of the setup script still goes through exec, and must not be
       recorded twice, so this one only streams what the poller does not. */
    exec: (command, options) =>
      Stream.fromIterable<ExecChunk>([
        { at: 0, exitCode: 0, stream: "exit" },
      ]).pipe(Stream.tap(() => Effect.sync(() => record(command, options)))),
    resumable: Option.some({
      progress: () => Effect.succeed({ exitCode, stderr, stdout }),
      start: (command, options) =>
        Effect.sync(() => {
          record(command, options);

          return { id: "cmd", session: "session" };
        }),
    }),
  };

  return { commands, environments, polled, sandbox: streamed };
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
          cache: Option.some({
            has: () => Effect.succeed(true),
            restore: (key: string) =>
              Effect.sync(() => {
                asked.push(key);
                return true;
              }),
            save: () => Effect.void,
          }),
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
          cache: Option.some({
            has: () => Effect.succeed(false),
            restore: () => Effect.succeed(false),
            save: () => Effect.void,
          }),
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
            cache: Option.some({
              has: () => Effect.succeed(false),
              restore: () => Effect.succeed(false),
              save: (key: string) =>
                Effect.sync(() => {
                  saved.push(key);
                }),
            }),
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

/* The defect this file now guards: a prepare went through the resumable path
   unconditionally, so on the five providers that cannot resume a command it
   failed before running at all. */
describe("a prepare on a provider that cannot resume a command", () => {
  test("runs, and returns what it reported", async () => {
    const { sandbox } = sandboxSaying(
      0,
      'ANPORD_PREPARE_RESULT={"rendererPort":4173}\n'
    );

    expect(await Effect.runPromise(run(sandbox))).toEqual({
      rendererPort: 4173,
    });
  });

  test("returns the same value a provider that resumes would", async () => {
    const output = 'ANPORD_PREPARE_RESULT={"rendererPort":4173}\n';
    const { polled } = sandboxSaying(0, output);
    const { sandbox } = sandboxSaying(0, output);

    expect(await Effect.runPromise(run(sandbox))).toEqual(
      await Effect.runPromise(run(polled))
    );
  });

  test("still tells the prepare a restore happened", async () => {
    const { environments, sandbox } = sandboxSaying(0, "");

    await Effect.runPromise(
      runPrepare({
        caseCache: { key: "deps-abc", path: "vendor" },
        prepare: { name: "prepareRepoImage", source: "export {}" },
        sandbox: {
          ...sandbox,
          cache: Option.some({
            has: () => Effect.succeed(true),
            restore: () => Effect.succeed(true),
            save: () => Effect.void,
          }),
        },
        workspace: "/tmp/ws",
      }).pipe(Effect.provide(SuspenderSleeping))
    );

    expect(environments[0]?.ANPORD_CACHE_RESTORED).toBe("1");
  });
});
