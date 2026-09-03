import { describe, expect, test } from "bun:test";
import { Effect, Option, Redacted, Stream } from "effect";
import type { ExecChunk, SandboxHandle } from "../../src/ports/sandbox";
import { SuspenderSleeping } from "../../src/services/resumable-command";
import { prepareWorkspace } from "../../src/services/workspace";
import { notResumableFixture } from "../fixtures/not-resumable";

const HOME = "/home/agent";
const CREDENTIALS = `${HOME}/.anpord-git-credentials`;

const recording = (exitCode: number) => {
  const steps: string[] = [];

  const sandbox: SandboxHandle = {
    exec: (command) => {
      steps.push(`exec ${command}`);

      return Stream.fromIterable<ExecChunk>([
        { at: 0, data: "", stream: "stderr" },
        {
          at: 0,
          exitCode: command.includes("clone") ? exitCode : 0,
          stream: "exit",
        },
      ]);
    },
    home: HOME,
    id: "test",
    provider: "daytona",
    ...notResumableFixture,
    streaming: false,
    writeFile: (path) =>
      Effect.sync(() => {
        steps.push(`write ${path}`);
      }),
  };

  return { sandbox, steps };
};

const prepare = (sandbox: SandboxHandle, token?: string) =>
  prepareWorkspaceWith({
    credential: Redacted.make({} as never),
    driver: { prepare: () => Effect.succeed({}) } as never,
    harness: "codex" as never,
    harnessVersion: "1",
    home: HOME,
    sandbox,
    prepare: null,
    profile: Option.none(),
    source: {
      kind: "repo",
      ref: null,
      url: "https://github.com/acme/widgets.git",
    },
    ...(token === undefined ? {} : { sourceToken: Redacted.make(token) }),
    workspace: "/tmp/ws",
  });

const prepareWorkspaceWith = (input: Parameters<typeof prepareWorkspace>[0]) =>
  prepareWorkspace(input).pipe(Effect.provide(SuspenderSleeping));

describe("cloning with an installation token", () => {
  test("writes the credential before the clone that needs it", async () => {
    const { sandbox, steps } = recording(0);

    await Effect.runPromise(prepare(sandbox, "ghs_token"));

    const wrote = steps.indexOf(`write ${CREDENTIALS}`);
    const cloned = steps.findIndex((step) => step.includes("clone"));

    expect(wrote).toBeGreaterThanOrEqual(0);
    expect(wrote).toBeLessThan(cloned);
  });

  test("removes the credential once the clone is done", async () => {
    const { sandbox, steps } = recording(0);

    await Effect.runPromise(prepare(sandbox, "ghs_token"));

    const cloned = steps.findIndex((step) => step.includes("clone"));
    const removed = steps.findIndex((step) => step.includes("rm -f"));

    expect(removed).toBeGreaterThan(cloned);
  });

  test("removes the credential even when the clone fails", async () => {
    const { sandbox, steps } = recording(128);

    await Effect.runPromise(Effect.either(prepare(sandbox, "ghs_token")));

    expect(steps.some((step) => step.includes("rm -f"))).toBe(true);
  });

  test("keeps the token out of the command, which ps can read", async () => {
    const { sandbox, steps } = recording(0);

    await Effect.runPromise(prepare(sandbox, "ghs_secret_value"));

    expect(steps.some((step) => step.includes("ghs_secret_value"))).toBe(false);
  });

  test("clones without a helper when there is no token", async () => {
    const { sandbox, steps } = recording(0);

    await Effect.runPromise(prepare(sandbox));

    expect(steps.some((step) => step.includes("credential.helper"))).toBe(
      false
    );
    expect(steps.some((step) => step.includes("write"))).toBe(false);
  });
});
