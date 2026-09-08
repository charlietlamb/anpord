import { expect, test } from "bun:test";
import {
  unavailableValue,
  validationCapture,
  validationExecution,
} from "@anpord/schema/domain/eval-validations";
import { judgeInput, validationsOf } from "./validation-results";

const evidence = {
  input: "Original prompt",
  output: "Observed answer",
  expected: "Expected answer",
};
const capture = validationCapture();

test.each([
  { instructions: "Judge instructions", input: JSON.stringify(evidence) },
  { prompt: `Judge instructions\n\nEvidence:\n${JSON.stringify(evidence)}` },
])("extracts recorded judge evidence across both adapters", (request) => {
  expect(judgeInput(capture(request))).toEqual([
    { label: "Agent answer", value: evidence.output },
    { label: "Judge instructions", value: "Judge instructions" },
    { label: "Agent prompt", value: evidence.input },
    { label: "Expected", value: evidence.expected },
  ]);
});

test.each([
  unavailableValue,
  { ...unavailableValue, state: "disabled" as const },
  {
    ...capture({ instructions: "Rules", input: JSON.stringify(evidence) }),
    truncated: true,
  },
  capture("broken JSON", "text"),
  capture({ unknown: "payload" }),
])("leaves missing, truncated, or unrecognized requests intact", (value) => {
  expect(judgeInput(value)).toBeNull();
});

const judgment = {
  name: "correct",
  model: "test-model",
  evaluator: "openai",
  score: 1,
  threshold: 1,
  choice: "correct",
  durationMs: 20,
  error: null,
  reason: "The answer matches.",
};

test("preserves legacy judgments without fabricating captured evidence", () => {
  const result = validationsOf({ ordinal: 1, judgments: [judgment] });
  expect(result).toHaveLength(1);
  expect(result[0]?.status).toBe("passed");
  expect(result[0]?.input.state).toBe("unavailable");
  expect(result[0]?.output.state).toBe("unavailable");
  expect(result[0]?.judgment?.reason).toBe(judgment.reason);
});

test("does not duplicate a captured judgment", () => {
  const validation = {
    ...validationExecution(
      { id: "judge:0", index: 0, kind: "judge", name: "correct" },
      0
    ),
    judgment,
  };
  expect(
    validationsOf({
      ordinal: 1,
      judgments: [judgment],
      validations: [validation],
    })
  ).toEqual([validation]);
});

test("preserves unscored errors instead of treating them as failed scores", () => {
  const result = validationsOf({
    ordinal: 1,
    judgments: [{ ...judgment, score: null, error: "Provider unavailable" }],
  });
  expect(result[0]?.status).toBe("error");
  expect(result[0]?.message).toBe("Provider unavailable");
});
