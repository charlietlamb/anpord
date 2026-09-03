import { describe, expect, it } from "bun:test";
import { Chunk, Effect, Option, Redacted, Stream } from "effect";
import { CommandDriver } from "../../../src/adapters/harness/command";
import type { HarnessEvent } from "../../../src/domain/harness-event";
import type { RequestedProfile } from "../../../src/domain/harness-profile";
import type { RunHarness } from "../../../src/ports/harness";
import type { ExecChunk, SandboxHandle } from "../../../src/ports/sandbox";
import { notResumableFixture } from "../../fixtures/not-resumable";

const HOME = "/home/agent";
const WORKSPACE = "/tmp/work space";
const TRACE = `${HOME}/.anpord/trace.ndjson`;

const profile = (
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

interface Script {
  readonly exitCode?: number;
  readonly stdout?: readonly string[];
  readonly trace?: string;
}

const fake = (script: Script) => {
  const commands: string[] = [];
  const writes: { path: string; content: string }[] = [];

  const sandbox: SandboxHandle = {
    exec: (command) => {
      commands.push(command);

      /* The trace fold is the one command the driver runs itself, and it is
         the only one that reads a file rather than starting the agent. */
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

const request = (
  sandbox: SandboxHandle,
  found: RequestedProfile,
  prompt = "fix it's broken"
): RunHarness => ({
  env: {},
  harness: "command",
  harnessVersion: "profile",
  model: "vendor/model",
  profile: Option.some(found),
  prompt,
  sandbox,
  systemPromptPath: Option.none(),
  workspace: WORKSPACE,
});

const journal = (script: Script, found = profile()) =>
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

const line = (event: Record<string, unknown>) => JSON.stringify(event);

const FINISHED = line({ _tag: "Finished", reason: "done" });

describe("the command harness command line", () => {
  it("carries the case in variables a shell cannot reinterpret", async () => {
    const { commands } = await journal({ stdout: [FINISHED] });
    const started = commands.find((command) => command.includes("bash -c"));

    expect(started).toBe(
      [
        `cd '${WORKSPACE}'`,
        "&&",
        "ANPORD_PROMPT='fix it'\\''s broken'",
        "ANPORD_MODEL='vendor/model'",
        `ANPORD_HOME='${HOME}'`,
        `ANPORD_WORKSPACE='${WORKSPACE}'`,
        `ANPORD_TRACE_LOG='${TRACE}'`,
        `BASH_ENV='${HOME}/.anpord/trace.sh'`,
        "bash -c './agent.sh'",
        "< /dev/null",
      ].join(" ")
    );
  });

  it("names the system prompt only when the profile ships one", async () => {
    const { commands, sandbox } = fake({ stdout: [FINISHED] });

    await Effect.runPromise(
      CommandDriver.run({
        ...request(sandbox, profile()),
        systemPromptPath: Option.some(`${HOME}/.anpord/system-prompt.md`),
      }).pipe(
        Effect.flatMap((session) => Stream.runDrain(session.events)),
        Effect.scoped
      )
    );

    expect(commands[0]).toContain(
      `ANPORD_SYSTEM_PROMPT_FILE='${HOME}/.anpord/system-prompt.md'`
    );
  });
});

describe("a command harness process that exits non-zero", () => {
  it("keeps the journal it printed before Finished", async () => {
    const { events } = await journal({
      exitCode: 1,
      stdout: [
        line({ _tag: "Message", role: "assistant", text: "done" }),
        FINISHED,
      ],
    });

    expect(events.map((event) => event._tag)).toEqual(["Message", "Finished"]);
    expect(events.at(-1)).toEqual({ _tag: "Finished", at: 11, reason: "done" });
  });

  it("closes a journal that never finished with the exit itself", async () => {
    const { events } = await journal({
      exitCode: 7,
      stdout: [line({ _tag: "Message", role: "assistant", text: "half" })],
    });

    expect(events.at(-1)).toEqual({
      _tag: "Finished",
      at: 50,
      reason: "exit 7",
    });
  });
});

describe("the command harness trace fold", () => {
  const traceLine = (argv: string) =>
    JSON.stringify({
      argv,
      at: "2026-09-03T10:00:00Z",
      cwd: WORKSPACE,
      source: "trap",
    });

  it("appends only the commands the process did not report", async () => {
    const { events } = await journal({
      stdout: [
        line({
          _tag: "Command",
          command: "wc -l notes.txt",
          exitCode: 0,
          output: "1",
        }),
        FINISHED,
      ],
      trace: [traceLine("wc -l notes.txt"), traceLine("./agent.sh"), ""].join(
        "\n"
      ),
    });

    const commands = events.filter(
      (event): event is Extract<HarnessEvent, { _tag: "Command" }> =>
        event._tag === "Command"
    );

    expect(commands.map((event) => event.command)).toEqual([
      "wc -l notes.txt",
      "./agent.sh",
    ]);
    /* The trap runs before the command, so the fold's own entries can only
       say that something ran. */
    expect(commands.at(-1)?.exitCode).toBeNull();
  });

  it("adds nothing when the recorder saw no bash at all", async () => {
    const { events } = await journal({ stdout: [FINISHED], trace: "" });

    expect(events.map((event) => event._tag)).toEqual(["Finished"]);
  });
});

describe("the command harness driver", () => {
  it("writes the recorder and runs the profile's install", async () => {
    const { sandbox, commands, writes } = fake({});

    const env = await Effect.runPromise(
      CommandDriver.prepare({
        credential: Redacted.make({
          authMethodId: "env",
          connectionId: "env-1",
          integrationId: "env",
          revision: 1,
          values: {},
        }),
        home: HOME,
        profile: Option.some(profile({ install: "pip install sample" })),
        sandbox,
        version: "profile",
      })
    );

    expect(env).toEqual({});
    expect(writes.map(({ path }) => path)).toEqual([
      `${HOME}/.anpord/trace.sh`,
    ]);
    expect(commands).toEqual(["bash -lc 'pip install sample'"]);
  });

  it("refuses a task whose profile has no run command", async () => {
    const { sandbox } = fake({});

    const failure = await Effect.runPromise(
      CommandDriver.run(request(sandbox, profile({ run: null }))).pipe(
        Effect.scoped,
        Effect.flip
      )
    );

    expect(failure.reason).toContain("run command");
  });
});
