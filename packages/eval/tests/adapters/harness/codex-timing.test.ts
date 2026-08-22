import { describe, expect, it } from "bun:test";
import { Option } from "effect";
import { decodeCodexLine } from "../../../src/adapters/harness/codex-events";
import {
  noPending,
  type Pending,
  timeLine,
} from "../../../src/adapters/harness/codex-timing";
import type { HarnessEvent } from "../../../src/domain/harness-event";

/* Verbatim lines from a real `codex exec --json` run of a prompt asking for
   one `sleep 5`, with the arrival time each line was observed at. The command
   ran for 4986ms, and that is the number a waterfall must draw rather than
   the gap to whatever event came next. */
const STREAM: readonly (readonly [number, string])[] = [
  [979, '{"type":"thread.started","thread_id":"01a0263f-db6f-7711"}'],
  [984, '{"type":"turn.started"}'],
  [
    6924,
    '{"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"Running the command."}}',
  ],
  [
    7673,
    '{"type":"item.started","item":{"id":"item_1","type":"command_execution","command":"sleep 5","aggregated_output":"","exit_code":null,"status":"in_progress"}}',
  ],
  [
    12_659,
    '{"type":"item.completed","item":{"id":"item_1","type":"command_execution","command":"sleep 5","aggregated_output":"done\\n","exit_code":0,"status":"completed"}}',
  ],
  [
    14_114,
    '{"type":"turn.completed","usage":{"input_tokens":44002,"output_tokens":128}}',
  ],
];

const replay = (stream: readonly (readonly [number, string])[]) => {
  let pending: Pending = noPending;
  const events: HarnessEvent[] = [];

  for (const [at, line] of stream) {
    const timed = timeLine(decodeCodexLine(line), at, pending);

    pending = timed.pending;

    if (Option.isSome(timed.event)) {
      events.push(timed.event.value);
    }
  }

  return { events, pending };
};

describe("pairing a command to its start", () => {
  it("measures a real duration rather than a gap", () => {
    const { events } = replay(STREAM);
    const command = events.find((event) => event._tag === "Command");

    if (command?._tag !== "Command") {
      throw new Error("expected a command in the journal");
    }

    expect(command.startedAt).toBe(7673);
    expect(command.at).toBe(12_659);

    /* The sleep was 5s. Anything reading 1455ms here is measuring the gap to
       the next event instead, which is the bug this whole change exists to
       avoid. */
    expect((command.at ?? 0) - (command.startedAt ?? 0)).toBe(4986);
  });

  it("emits nothing for the started line", () => {
    const { events } = replay(STREAM);

    /* One entry per command carrying both ends, not two carrying one each. */
    expect(events.filter((event) => event._tag === "Command")).toHaveLength(1);
  });

  it("stamps an event that has no span", () => {
    const { events } = replay(STREAM);
    const message = events.find((event) => event._tag === "Message");

    expect(message?.at).toBe(6924);
  });

  it("keeps the journal in the order it happened", () => {
    const { events } = replay(STREAM);

    expect(events.map((event) => event._tag)).toEqual([
      "Started",
      "Message",
      "Command",
      "Finished",
    ]);
  });

  it("forgets a command once it is paired", () => {
    const { pending } = replay(STREAM);

    expect(pending.size).toBe(0);
  });
});

describe("a stream that does not pair cleanly", () => {
  const COMPLETED_ALONE =
    '{"type":"item.completed","item":{"id":"item_9","type":"command_execution","command":"ls","aggregated_output":"","exit_code":0,"status":"completed"}}';

  /** Absent rather than guessed. A dropped start means the width is unknown,
   * and a bar drawn from an invented number is the same lie as a pass rate
   * with no denominator. */
  it("emits a command with no start when its start was never seen", () => {
    const timed = timeLine(decodeCodexLine(COMPLETED_ALONE), 500, noPending);
    const event = Option.getOrThrow(timed.event);

    if (event._tag !== "Command") {
      throw new Error("expected a command");
    }

    expect(event.at).toBe(500);
    expect(event.startedAt).toBeUndefined();
  });

  /** An interrupted turn leaves the entry behind. It is discarded with the
   * stream, so it bounds rather than leaks, and it must never emit a bar with
   * an open end. */
  it("holds a start that never completes, and emits nothing for it", () => {
    const started =
      '{"type":"item.started","item":{"id":"item_1","type":"command_execution"}}';
    const timed = timeLine(decodeCodexLine(started), 100, noPending);

    expect(Option.isNone(timed.event)).toBe(true);
    expect(timed.pending.get("item_1")).toBe(100);
  });

  it("leaves the pending map alone for a line it cannot read", () => {
    const timed = timeLine(decodeCodexLine("not json"), 1, noPending);

    expect(Option.isNone(timed.event)).toBe(true);
    expect(timed.pending.size).toBe(0);
  });
});
