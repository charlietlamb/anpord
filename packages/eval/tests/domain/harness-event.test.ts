import { describe, expect, it } from "bun:test";
import { Either, Schema } from "effect";
import { HarnessEvent } from "../../src/domain/harness-event";

const decode = Schema.decodeUnknownEither(HarnessEvent);

/** Payloads copied byte for byte out of `eval_event` rows written before
 * timing existed. 2143 stored trials are shaped like this, and a required
 * timestamp would have made every one of them undecodable. */
const STORED_BEFORE_TIMING = [
  { _tag: "Command", command: "bun test", exitCode: 0, output: "1 pass" },
  {
    _tag: "Command",
    command: "/bin/sh -lc 'pwd && git status --short'",
    exitCode: 128,
    output: "fatal: not a git repository\n",
  },
  { _tag: "FileChange", paths: ["/tmp/w/total.ts"] },
  { _tag: "Finished", reason: "turn.completed" },
  { _tag: "Message", role: "assistant", text: "I'll inspect the module." },
  {
    _tag: "Started",
    model: "codex",
    sessionId: "01a01b1b-8b8a-75e1-ab84-a57f9ade2dac",
  },
];

describe("a journal recorded before timing existed", () => {
  it.each(STORED_BEFORE_TIMING)("decodes $_tag unchanged", (payload) => {
    const decoded = decode(payload);

    expect(Either.isRight(decoded)).toBe(true);
  });

  /** Absent rather than zero. A missing timestamp is unknown, and epoch zero
   * would place every historical event in 1970 at the head of a waterfall. */
  it("leaves the time absent rather than inventing one", () => {
    const decoded = decode({
      _tag: "Command",
      command: "bun test",
      exitCode: 0,
      output: "1 pass",
    });

    if (Either.isLeft(decoded)) {
      throw new Error("expected a stored command to decode");
    }

    expect(decoded.right).not.toHaveProperty("at");
    expect(decoded.right).not.toHaveProperty("startedAt");
  });
});

describe("a journal recorded with timing", () => {
  it("keeps both ends of a command", () => {
    const decoded = decode({
      _tag: "Command",
      at: 12_659,
      command: "sleep 5",
      exitCode: 0,
      output: "",
      startedAt: 7673,
    });

    if (Either.isLeft(decoded)) {
      throw new Error("expected a timed command to decode");
    }

    if (decoded.right._tag !== "Command") {
      throw new Error("expected a command");
    }

    /* The measured duration of a real `sleep 5`, taken from a captured Codex
       stream: the number a waterfall draws, rather than a gap to whatever
       event happened to come next. */
    expect(decoded.right.at).toBe(12_659);
    expect(decoded.right.startedAt).toBe(7673);
  });

  it("carries a time on an event that has no span", () => {
    const decoded = decode({
      _tag: "Message",
      at: 6924,
      role: "assistant",
      text: "Running the two commands.",
    });

    expect(Either.isRight(decoded)).toBe(true);
  });
});
