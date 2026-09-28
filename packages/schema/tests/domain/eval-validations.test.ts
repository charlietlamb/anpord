import { describe, expect, it } from "bun:test";
import { Schema } from "effect";
import {
  EvalValidation,
  validationWithoutEvidence,
} from "../../src/domain/eval-validations";

const captured = (text: string) =>
  ({ format: "json", state: "captured", text, truncated: false }) as const;

const checked: EvalValidation = {
  calls: [
    {
      durationMs: 3,
      error: null,
      index: 0,
      input: captured("a customer id"),
      method: "api.calls",
      output: captured("every call the agent made"),
      startedAt: 0,
    },
  ],
  durationMs: 9,
  error: null,
  exitCode: null,
  id: "code:0",
  index: 0,
  input: captured("the whole transcript"),
  kind: "code",
  logs: [{ at: 1, index: 0, level: "stdout", value: captured("a line") }],
  message: "the catalog matched",
  name: "catalog matches",
  output: captured("the catalog it read"),
  startedAt: 0,
  status: "passed",
  truncated: false,
};

describe("a validation stripped of the evidence it captured", () => {
  it("keeps its verdict and drops every captured text", () => {
    const stripped = validationWithoutEvidence(checked);

    expect({
      call: stripped.calls[0],
      input: stripped.input,
      log: stripped.logs[0]?.value,
      message: stripped.message,
      output: stripped.output,
      status: stripped.status,
      truncated: stripped.truncated,
    }).toEqual({
      call: {
        durationMs: 3,
        error: null,
        index: 0,
        input: {
          format: "json",
          state: "unavailable",
          text: "",
          truncated: true,
        },
        method: "api.calls",
        output: {
          format: "json",
          state: "unavailable",
          text: "",
          truncated: true,
        },
        startedAt: 0,
      },
      input: {
        format: "json",
        state: "unavailable",
        text: "",
        truncated: true,
      },
      log: { format: "json", state: "unavailable", text: "", truncated: true },
      message: "the catalog matched",
      output: {
        format: "json",
        state: "unavailable",
        text: "",
        truncated: true,
      },
      status: "passed",
      truncated: true,
    });
  });
});

describe("a validation timed with a fractional clock", () => {
  it("is taken with its duration rounded", () => {
    const decoded = Schema.decodeUnknownSync(EvalValidation)({
      ...checked,
      calls: [{ ...checked.calls[0], durationMs: 8.216_552_734_375 }],
      durationMs: 8.216_552_734_375,
    });

    expect([decoded.durationMs, decoded.calls[0]?.durationMs]).toEqual([8, 8]);
  });
});
