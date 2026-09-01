import { describe, expect, it } from "bun:test";
import { Effect, Stream } from "effect";
import { notResumableFixture } from "../../../tests/fixtures/not-resumable";
import type { ExecChunk, SandboxHandle } from "../../ports/sandbox";
import { harnessLines, shellQuote } from "./process";

const sandbox = (chunks: readonly ExecChunk[]): SandboxHandle => ({
  exec: () => Stream.fromIterable(chunks),
  home: "/home/test",
  id: "sandbox",
  provider: "daytona",
  ...notResumableFixture,
  streaming: true,
  writeFile: () => Effect.void,
});

describe("harness process framing", () => {
  it("quotes customer text for a shell", () => {
    expect(shellQuote("it's $HOME")).toBe("'it'\\''s $HOME'");
  });

  it("frames fragmented, CRLF, and unterminated output", async () => {
    const lines = await Effect.runPromise(
      harnessLines(
        "codex",
        sandbox([
          { at: 1, data: "one\ntw", stream: "stdout" },
          { at: 2, data: "o\r\nthree", stream: "stdout" },
          { at: 3, exitCode: 0, stream: "exit" },
        ]),
        "true",
        {}
      ).pipe(Stream.runCollect, Effect.map(Array.from))
    );

    expect(lines).toEqual([
      { _tag: "line", at: 1, line: "one" },
      { _tag: "line", at: 2, line: "two" },
      { _tag: "line", at: 2, line: "three" },
    ]);
  });

  it("returns bounded stderr for a failed process", async () => {
    const failure = await Effect.runPromise(
      harnessLines(
        "codex",
        sandbox([
          { at: 1, data: "specific failure", stream: "stderr" },
          { at: 2, exitCode: 7, stream: "exit" },
        ]),
        "false",
        {}
      ).pipe(Stream.runDrain, Effect.flip)
    );

    expect(failure.reason).toBe("specific failure");
  });
});
