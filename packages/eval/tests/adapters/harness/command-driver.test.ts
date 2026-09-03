import { describe, expect, it } from "bun:test";
import { Effect, Option, Redacted, Stream } from "effect";
import { CommandDriver } from "../../../src/adapters/harness/command";
import {
  FINISHED,
  fake,
  HOME,
  journal,
  line,
  profile,
  request,
  WORKSPACE,
} from "./command-fake";

const TRACE = `${HOME}/.anpord/trace.ndjson`;

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

  it("accumulates each turn's usage rather than restating a total", async () => {
    const { usage } = await journal({
      stdout: [
        line({ _tag: "Usage", inputTokens: 10, outputTokens: 2 }),
        line({
          _tag: "Usage",
          cacheReadTokens: 4,
          inputTokens: 5,
          outputTokens: 1,
        }),
        FINISHED,
      ],
    });

    expect(Option.getOrThrow(usage)).toEqual({
      cacheReadTokens: 4,
      cacheWriteTokens: 0,
      inputTokens: 15,
      outputTokens: 3,
      totalTokens: 18,
    });
  });
});
