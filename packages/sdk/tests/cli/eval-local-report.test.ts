import { describe, expect, it } from "bun:test";
import {
  PublicStartEvalRequest,
  ReportTrialRequest,
} from "@anpord/schema/public/evals-api";
import { Schema } from "effect";

const decodeStart = Schema.decodeUnknownSync(PublicStartEvalRequest);
const decodeReport = Schema.decodeUnknownSync(ReportTrialRequest);

const start = {
  cases: [{ id: "a-case", name: "a case", verify: "true" }],
  prompt: "{{task}}",
  tasks: [{ harness: "codex", model: "gpt-5.6-sol" }],
  trials: 1,
};

describe("asking the platform to record a run it will not execute", () => {
  it("is off unless the caller says so", () => {
    expect(decodeStart(start).executeLocally).toBeUndefined();
  });

  it("is carried when the caller asks", () => {
    expect(decodeStart({ ...start, executeLocally: true }).executeLocally).toBe(
      true
    );
  });
});

describe("what a client reports", () => {
  const trial = {
    caseName: "a case",
    events: [],
    ordinal: 0,
    outcome: {
      commandCount: 1,
      exitCode: 0,
      modelMs: 10,
      passed: true,
      sandboxMs: 5,
      status: "passed",
      verifySteps: [],
      voidFields: [],
    },
    taskIndex: 0,
  };

  it("names the run and the cell within it", () => {
    const decoded = decodeReport({ id: "run_1", trial });

    expect(decoded.id).toBe("run_1");
    expect(decoded.trial.caseName).toBe("a case");
    expect(decoded.trial.taskIndex).toBe(0);
  });

  it("carries the verdict the verifier reached", () => {
    expect(decodeReport({ id: "run_1", trial }).trial.outcome.status).toBe(
      "passed"
    );
  });

  it("refuses a cell it cannot address", () => {
    expect(() =>
      decodeReport({ id: "run_1", trial: { ...trial, taskIndex: -1 } })
    ).toThrow();
  });

  it("refuses a status the platform does not name", () => {
    expect(() =>
      decodeReport({
        id: "run_1",
        trial: { ...trial, outcome: { ...trial.outcome, status: "maybe" } },
      })
    ).toThrow();
  });
});
