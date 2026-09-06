import { expect, test } from "bun:test";
import { HarnessEvent } from "@anpord/eval/domain/harness-event";
import type { GridCell } from "@anpord/eval/grid/state";
import { EvalTrial } from "@anpord/schema/domain/evals";
import { Option, Schema } from "effect";
import { asTrials } from "./trial-to-api";

const trial = (events: readonly HarnessEvent[]) => {
  const cell: GridCell = {
    caseName: "lookup",
    cellKey: null,
    distribution: Option.none(),
    internalId: null,
    live: new Map([[1, events]]),
    setup: Option.none(),
    status: "running",
    taskIndex: 0,
    trials: [Option.none()],
  };
  return Schema.decodeUnknownSync(EvalTrial)(
    JSON.parse(JSON.stringify(asTrials(cell)[0]))
  );
};

test("preserves MCP input and result through stored events and API encoding", () => {
  const event: HarnessEvent = {
    _tag: "ToolCall",
    callId: "call_1",
    name: "catalog.get",
    status: "completed",
    input: '{"id":"fixture"}',
    output: '{"content":[{"type":"text","text":"Fixture"}]}',
  };
  const stored = Schema.decodeUnknownSync(HarnessEvent)(
    JSON.parse(JSON.stringify(event))
  );
  const response = trial([stored]);
  expect(response.trajectory[0]).toMatchObject({
    _tag: "toolCall",
    name: "catalog.get",
    input: '{"id":"fixture"}',
    output: '{"content":[{"type":"text","text":"Fixture"}]}',
    outputTruncated: false,
  });
});

test("bounds call payloads and explicitly marks truncation", () => {
  const response = trial([
    {
      _tag: "ToolCall",
      callId: "call_1",
      name: "catalog.get",
      status: "failed",
      input: "i".repeat(4001),
      output: "o".repeat(4001),
      error: "e".repeat(4001),
    },
  ]);
  expect(response.trajectory[0]).toMatchObject({
    input: "i".repeat(4000),
    output: "o".repeat(4000),
    error: "e".repeat(4000),
    inputTruncated: true,
    outputTruncated: true,
    errorTruncated: true,
  });
});

test("keeps historical results absent instead of inventing an empty output", () => {
  const response = trial([
    {
      _tag: "ToolCall",
      callId: null,
      name: "catalog.get",
      status: null,
      input: "{}",
    },
  ]);
  expect(response.trajectory[0]).not.toHaveProperty("output");
});
