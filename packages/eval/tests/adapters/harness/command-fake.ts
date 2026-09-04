import { Chunk, Effect, Option, Stream } from "effect";
import { CommandDriver } from "../../../src/adapters/harness/command";
import type { RequestedProfile } from "../../../src/domain/harness-profile";
import type { RunHarness } from "../../../src/ports/harness";
import type { ExecChunk, SandboxHandle } from "../../../src/ports/sandbox";
import { notResumableFixture } from "../../fixtures/not-resumable";

export const HOME = "/home/agent";
export const WORKSPACE = "/tmp/work space";
const PROMPT = "fix it's broken";

export const profile = (
  overrides: Partial<RequestedProfile> = {}
): RequestedProfile => ({
  env: null,
  files: {},
  install: null,
  name: "sample",
  run: "./agent.sh",
  systemPrompt: null,
  ...overrides,
});

export interface Script {
  readonly exitCode?: number;
  readonly stdout?: readonly string[];
  readonly trace?: string;
}

/** A sandbox that replays a scripted run and remembers what it was asked. */
export const fake = (script: Script) => {
  const commands: string[] = [];
  const writes: { path: string; content: string }[] = [];

  const sandbox: SandboxHandle = {
    exec: (command) => {
      commands.push(command);

      /* The trace fold is the one command the driver runs itself, and the only
         one that reads a file rather than starting the agent. */
      if (command.startsWith("cat ")) {
        return Stream.fromIterable<ExecChunk>([
          { at: 90, data: script.trace ?? "", stream: "stdout" },
          { at: 91, exitCode: 0, stream: "exit" },
        ]);
      }

      return Stream.fromIterable<ExecChunk>([
        ...(script.stdout ?? []).map(
          (line, index): ExecChunk => ({
            at: 10 + index,
            data: `${line}\n`,
            stream: "stdout",
          })
        ),
        { at: 50, exitCode: script.exitCode ?? 0, stream: "exit" },
      ]);
    },
    home: HOME,
    id: "sandbox",
    provider: "e2b",
    ...notResumableFixture,
    streaming: true,
    writeFile: (path, content) =>
      Effect.sync(() => {
        writes.push({ content, path });
      }),
  };

  return { commands, sandbox, writes };
};

export const request = (
  sandbox: SandboxHandle,
  found: RequestedProfile
): RunHarness => ({
  env: {},
  harness: "command",
  harnessVersion: "profile",
  model: "vendor/model",
  profile: Option.some(found),
  prompt: PROMPT,
  sandbox,
  systemPromptPath: Option.none(),
  workspace: WORKSPACE,
});

export const journal = (script: Script, found = profile()) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const { commands, sandbox } = fake(script);
      const session = yield* CommandDriver.run(request(sandbox, found));
      const events = Chunk.toReadonlyArray(
        yield* Stream.runCollect(session.events)
      );

      return { commands, events, usage: yield* session.usage };
    }).pipe(Effect.scoped)
  );

export const line = (event: Record<string, unknown>) => JSON.stringify(event);

export const FINISHED = line({ _tag: "Finished", reason: "done" });
