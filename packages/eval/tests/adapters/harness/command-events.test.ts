import { describe, expect, it } from "bun:test";
import { Chunk, Effect, Option, Stream } from "effect";
import {
  decodeCommandLine,
  finishedOnExit,
} from "../../../src/adapters/harness/command-events";
import {
  type HarnessExit,
  type HarnessOutput,
  harnessLines,
} from "../../../src/adapters/harness/process";
import { EMPTY_TALLY, tallied } from "../../../src/domain/usage-tally";
import type { ExecChunk, SandboxHandle } from "../../../src/ports/sandbox";
import { declinesEverything } from "../../fixtures/declines-everything";

const AT = 1_700_000_000_000;

const LINES = {
  Command:
    '{"_tag":"Command","command":"bun test","exitCode":1,"output":"expect(5).toBe(6)\\n"}',
  FileChange: '{"_tag":"FileChange","paths":["/workspace/src/total.ts"]}',
  Finished: '{"_tag":"Finished","reason":"done","at":1788300005000}',
  Message:
    '{"_tag":"Message","role":"assistant","text":"Reading the failing test first."}',
  ToolCall:
    '{"_tag":"ToolCall","callId":"call_7","name":"search","input":"{\\"query\\":\\"total\\"}","status":"completed"}',
};

const sandbox = (chunks: readonly ExecChunk[]): SandboxHandle => ({
  exec: () => Stream.fromIterable(chunks),
  home: "/home/test",
  id: "sandbox",
  provider: "e2b",
  ...declinesEverything,
  writeFile: () => Effect.void,
});

const reported = (chunks: readonly ExecChunk[]) =>
  Effect.runPromise(
    harnessLines("codex", sandbox(chunks), "run", {}, { exit: "report" }).pipe(
      Stream.runCollect,
      Effect.map(Chunk.toReadonlyArray)
    )
  );

const exitOf = (outputs: readonly HarnessOutput[]): HarnessExit => {
  const last = outputs.at(-1);

  if (last === undefined || last._tag !== "exit") {
    throw new Error("expected the stream to end with the exit");
  }

  return last;
};

describe("decodeCommandLine", () => {
  it.each(Object.entries(LINES))("decodes %s", (tag, line) => {
    const decoded = decodeCommandLine(line, AT);

    expect(decoded.events?.map((event): string => event._tag)).toEqual([tag]);
  });

  it("fills the time from the line when the event carries none", () => {
    const [event] = decodeCommandLine(LINES.Message, AT).events ?? [];

    expect(event?.at).toBe(AT);
  });

  it("keeps the time the event carries", () => {
    const [event] = decodeCommandLine(LINES.Finished, AT).events ?? [];

    expect(event?.at).toBe(1_788_300_005_000);
  });

  it("opens the session from a customer Started rather than repeating it", () => {
    const decoded = decodeCommandLine(
      '{"_tag":"Started","sessionId":"run-42","model":"sample/model"}',
      AT
    );

    expect(decoded).toEqual({ model: "sample/model", sessionId: "run-42" });
  });

  it("ignores a line that is not an event", () => {
    expect(decodeCommandLine("installing deps...", AT)).toEqual({});
    expect(decodeCommandLine('{"_tag":"Unknown"}', AT)).toEqual({});
    expect(decodeCommandLine('{"_tag":"Command"}', AT)).toEqual({});
    expect(decodeCommandLine("", AT)).toEqual({});
  });

  it("accumulates usage across lines as per-turn additions", () => {
    const first = decodeCommandLine(
      '{"_tag":"Usage","inputTokens":100,"outputTokens":10}',
      AT
    );
    const second = decodeCommandLine(
      '{"_tag":"Usage","inputTokens":50,"outputTokens":5,"cacheReadTokens":40,"totalTokens":95}',
      AT
    );

    expect(first.usageIsCumulative).toBe(false);
    expect(first.usage).toEqual({
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      inputTokens: 100,
      outputTokens: 10,
      totalTokens: 110,
    });

    const tally = [first, second].reduce(
      (current, { usage }) =>
        usage === undefined ? current : tallied(current, usage, false),
      EMPTY_TALLY
    );

    expect(tally.total.totalTokens).toBe(205);
    expect(tally.total.cacheReadTokens).toBe(40);
    expect(tally.turns).toHaveLength(2);
  });
});

describe("a process that exits non-zero", () => {
  it("keeps what it printed before Finished", async () => {
    const outputs = await reported([
      {
        at: 1,
        data: `${LINES.Message}\n${LINES.Finished}\n`,
        stream: "stdout",
      },
      { at: 2, data: "boom", stream: "stderr" },
      { at: 3, exitCode: 1, stream: "exit" },
    ]);

    const events = outputs.flatMap((output) =>
      output._tag === "line"
        ? (decodeCommandLine(output.line, output.at).events ?? [])
        : []
    );

    expect(events.map((event) => event._tag)).toEqual(["Message", "Finished"]);
    expect(exitOf(outputs)).toEqual({
      _tag: "exit",
      at: 3,
      exitCode: 1,
      stderr: "boom",
    });
    expect(Option.isNone(finishedOnExit(exitOf(outputs), true))).toBe(true);
  });

  it("gives the driver enough to close a journal that never finished", async () => {
    const outputs = await reported([
      { at: 1, data: `${LINES.Message}\n`, stream: "stdout" },
      { at: 4, exitCode: 1, stream: "exit" },
    ]);

    const finished = finishedOnExit(exitOf(outputs), false);

    expect(Option.getOrThrow(finished)).toEqual({
      _tag: "Finished",
      at: 4,
      reason: "exit 1",
    });
  });
});
