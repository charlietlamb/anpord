import { afterEach, describe, expect, test } from "bun:test";
import { decodeCommandLine } from "@sphynx/eval/adapters/harness/command-events";
import { createEmitter, env } from "../../src/runner";

const FIXED_NOW = 1_788_300_000_000;

const recorded = () => {
  const lines: string[] = [];
  const emitter = createEmitter({
    now: () => FIXED_NOW,
    write: (line) => lines.push(line),
  });

  return { emitter, lines };
};

const decodedLines = (lines: readonly string[]) =>
  lines.map((line) => decodeCommandLine(line, 0));

describe("createEmitter", () => {
  test("started decodes to the session id and model", () => {
    const { emitter, lines } = recorded();

    emitter.started({ model: "fixture", sessionId: "run-1" });

    expect(decodedLines(lines)).toEqual([
      { model: "fixture", sessionId: "run-1" },
    ]);
  });

  test("message defaults to the assistant role and carries usage", () => {
    const { emitter, lines } = recorded();

    emitter.message({
      text: "done",
      usage: { cacheReadTokens: 4, inputTokens: 10, outputTokens: 2 },
    });

    expect(decodedLines(lines)).toEqual([
      {
        events: [
          {
            _tag: "Message",
            at: FIXED_NOW,
            role: "assistant",
            text: "done",
            usage: {
              cacheReadTokens: 4,
              cacheWriteTokens: 0,
              inputTokens: 10,
              outputTokens: 2,
              totalTokens: 12,
            },
          },
        ],
      },
    ]);
  });

  test("message keeps an explicit user role", () => {
    const { emitter, lines } = recorded();

    emitter.message({ role: "user", text: "hi" });

    expect(decodedLines(lines)).toEqual([
      {
        events: [{ _tag: "Message", at: FIXED_NOW, role: "user", text: "hi" }],
      },
    ]);
  });

  test("toolCall stringifies a non-string input and output", () => {
    const { emitter, lines } = recorded();

    emitter.toolCall({
      callId: "call_7",
      input: { query: "total" },
      name: "search",
      output: ["a", "b"],
      status: "completed",
    });

    expect(decodedLines(lines)).toEqual([
      {
        events: [
          {
            _tag: "ToolCall",
            at: FIXED_NOW,
            callId: "call_7",
            input: '{"query":"total"}',
            name: "search",
            output: '["a","b"]',
            status: "completed",
          },
        ],
      },
    ]);
  });

  test("toolCall passes a string input through and defaults callId and status to null", () => {
    const { emitter, lines } = recorded();

    emitter.toolCall({ error: "boom", input: "raw", name: "run" });

    expect(decodedLines(lines)).toEqual([
      {
        events: [
          {
            _tag: "ToolCall",
            at: FIXED_NOW,
            callId: null,
            error: "boom",
            input: "raw",
            name: "run",
            status: null,
          },
        ],
      },
    ]);
  });

  test("usage decodes to the usage object with totals filled in", () => {
    const { emitter, lines } = recorded();

    emitter.usage({ inputTokens: 9120, outputTokens: 312 });

    expect(decodedLines(lines)).toEqual([
      {
        usage: {
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
          inputTokens: 9120,
          outputTokens: 312,
          totalTokens: 9432,
        },
        usageIsCumulative: false,
      },
    ]);
  });

  test("usage throws on negative or non-integer tokens and writes nothing", () => {
    const { emitter, lines } = recorded();

    expect(() => emitter.usage({ inputTokens: -1, outputTokens: 2 })).toThrow();
    expect(() =>
      emitter.usage({ inputTokens: 1.5, outputTokens: 2 })
    ).toThrow();
    expect(() =>
      emitter.message({
        text: "x",
        usage: { inputTokens: 1, outputTokens: -2 },
      })
    ).toThrow();
    expect(lines).toEqual([]);
  });

  test("command decodes with a null exit code", () => {
    const { emitter, lines } = recorded();

    emitter.command({ command: "bun test", exitCode: null, output: "ok\n" });

    expect(decodedLines(lines)).toEqual([
      {
        events: [
          {
            _tag: "Command",
            at: FIXED_NOW,
            command: "bun test",
            exitCode: null,
            output: "ok\n",
          },
        ],
      },
    ]);
  });

  test("fileChange decodes the paths", () => {
    const { emitter, lines } = recorded();

    emitter.fileChange(["/workspace/a.ts", "/workspace/b.ts"]);

    expect(decodedLines(lines)).toEqual([
      {
        events: [
          {
            _tag: "FileChange",
            at: FIXED_NOW,
            paths: ["/workspace/a.ts", "/workspace/b.ts"],
          },
        ],
      },
    ]);
  });

  test("finished twice writes one line", () => {
    const { emitter, lines } = recorded();

    emitter.finished("done");
    emitter.finished("again");

    expect(decodedLines(lines)).toEqual([
      { events: [{ _tag: "Finished", at: FIXED_NOW, reason: "done" }] },
    ]);
  });

  test("an invalid line throws at the call site", () => {
    const { emitter, lines } = recorded();

    expect(() =>
      emitter.command({ command: "x", exitCode: 1.5, output: "" })
    ).toThrow();
    expect(() => emitter.toolCall({ input: undefined, name: "x" })).toThrow();
    expect(lines).toEqual([]);
  });
});

describe("env", () => {
  const names = [
    "SPHYNX_HOME",
    "SPHYNX_MODEL",
    "SPHYNX_PROMPT",
    "SPHYNX_SYSTEM_PROMPT_FILE",
    "SPHYNX_TRACE_LOG",
    "SPHYNX_WORKSPACE",
  ] as const;
  const saved = Object.fromEntries(names.map((n) => [n, process.env[n]]));

  afterEach(() => {
    for (const name of names) {
      if (saved[name] === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = saved[name];
      }
    }
  });

  test("throws a clear error without SPHYNX_PROMPT", () => {
    process.env.SPHYNX_HOME = "/home/agent";
    process.env.SPHYNX_MODEL = "fixture";
    process.env.SPHYNX_TRACE_LOG = "/home/agent/.sphynx/trace.ndjson";
    process.env.SPHYNX_WORKSPACE = "/workspace";
    delete process.env.SPHYNX_PROMPT;

    expect(() => env()).toThrow("SPHYNX_PROMPT is not set");
  });

  test("returns the variables the command harness sets", () => {
    process.env.SPHYNX_HOME = "/home/agent";
    process.env.SPHYNX_MODEL = "fixture";
    process.env.SPHYNX_PROMPT = "Write hello.txt";
    process.env.SPHYNX_TRACE_LOG = "/home/agent/.sphynx/trace.ndjson";
    process.env.SPHYNX_WORKSPACE = "/workspace";
    delete process.env.SPHYNX_SYSTEM_PROMPT_FILE;

    expect(env()).toEqual({
      home: "/home/agent",
      model: "fixture",
      prompt: "Write hello.txt",
      systemPromptFile: undefined,
      traceLog: "/home/agent/.sphynx/trace.ndjson",
      workspace: "/workspace",
    });

    process.env.SPHYNX_SYSTEM_PROMPT_FILE = "/home/agent/system.md";

    expect(env().systemPromptFile).toBe("/home/agent/system.md");
  });
});
