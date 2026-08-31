import { describe, expect, test } from "bun:test";
import { Effect, Exit, Stream } from "effect";
import type { ExecChunk, SandboxHandle } from "../../src/ports/sandbox";
import { runPrepare } from "../../src/services/workspace-setup";

const sandboxSaying = (exitCode: number, stdout: string, stderr = "") => {
  const commands: string[] = [];

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
    streaming: false,
    writeFile: () => Effect.void,
  } as unknown as SandboxHandle;

  return { commands, sandbox };
};

const run = (sandbox: SandboxHandle) =>
  runPrepare({
    sandbox,
    prepare: { name: "prepareRepoImage", source: "export {}" },
    workspace: "/tmp/ws",
  });

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
});
