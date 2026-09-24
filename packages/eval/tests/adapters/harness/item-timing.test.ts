import { describe, expect, it } from "bun:test";
import type { HarnessEvent } from "@anpord/schema/domain/harness-event";
import { decodeCodexLine } from "../../../src/adapters/harness/codex-events";
import {
  noPending,
  type Pending,
  paired,
} from "../../../src/adapters/harness/item-timing";

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
    const [next, timed] = paired(pending, decodeCodexLine(line, at), at);

    pending = next;
    events.push(...timed);
  }

  return { events, pending };
};

describe("pairing a command to its start", () => {
  it("pairs an MCP call with its own start", () => {
    const item = {
      type: "mcp_tool_call",
      id: "item_1",
      server: "inventory",
      tool: "lookup",
      arguments: { id: "fixture" },
    };
    const { events, pending } = replay([
      [
        100,
        JSON.stringify({
          type: "item.started",
          item: { ...item, status: "in_progress" },
        }),
      ],
      [
        350,
        JSON.stringify({
          type: "item.completed",
          item: { ...item, status: "completed" },
        }),
      ],
    ]);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      _tag: "ToolCall",
      name: "inventory.lookup",
      startedAt: 100,
      at: 350,
    });
    expect(pending.size).toBe(0);
  });

  it("measures a real duration rather than a gap", () => {
    const { events } = replay(STREAM);
    const command = events.find((event) => event._tag === "Command");

    if (command?._tag !== "Command") {
      throw new Error("expected a command in the journal");
    }

    expect(command.startedAt).toBe(7673);
    expect(command.at).toBe(12_659);

    expect((command.at ?? 0) - (command.startedAt ?? 0)).toBe(4986);
  });

  it("emits nothing for the started line", () => {
    const { events } = replay(STREAM);

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

  it("emits a command with no start when its start was never seen", () => {
    const [, events] = paired(
      noPending,
      decodeCodexLine(COMPLETED_ALONE, 500),
      500
    );
    const event = events[0];

    if (event?._tag !== "Command") {
      throw new Error("expected a command");
    }

    expect(event.at).toBe(500);
    expect(event.startedAt).toBeUndefined();
  });

  it("holds a start that never completes, and emits nothing for it", () => {
    const started =
      '{"type":"item.started","item":{"id":"item_1","type":"command_execution"}}';
    const [pending, events] = paired(
      noPending,
      decodeCodexLine(started, 100),
      100
    );

    expect(events).toEqual([]);
    expect(pending.get("item_1")).toBe(100);
  });

  it("leaves the pending map alone for a line it cannot read", () => {
    const [pending, events] = paired(
      noPending,
      decodeCodexLine("not json", 1),
      1
    );

    expect(events).toEqual([]);
    expect(pending.size).toBe(0);
  });
});
