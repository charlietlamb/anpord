import { describe, expect, test } from "bun:test";
import {
  validationCapture,
  validationExecution,
} from "@anpord/schema/domain/eval-validations";
import { Option } from "effect";
import type { TrialStatus } from "../../src/domain/trial";
import { runToState } from "../../src/grid/stored-run-state";
import type { RunDetail } from "../../src/repositories/run-detail";

const detailWith = (status: string): RunDetail =>
  ({
    cells: [
      {
        caseName: "a",
        cell: {
          cellKey: "key",
          harness: "codex",
          harnessVersion: "1",
          internalId: "cell-internal",
          model: "gpt-5.6-sol",
          provider: "daytona",
          status: "running",
        },
        distribution: {},
        prepareName: null,
        profile: null,
        prompt: "{{task}}",
        repoRef: null,
        repoUrl: null,
        trials: [{ internalId: "trial-internal", status }],
        validatorName: null,
        verifyCommand: "true",
        workspace: "/workspace",
      },
    ],
    run: {
      trigger: null,
      createdAt: new Date(0),
      failure: null,
      finishedAt: null,
      id: "run",
      name: "planner-core",
      organizationId: "org",
      status: "running",
    },
  }) as unknown as RunDetail;

/** What a reader of the rebuilt run sees for a trial the column said was
 * `stored`. */
const statusRead = (stored: string) => {
  const trial = runToState(detailWith(stored)).cells[0]?.trials[0];

  return Option.getOrNull(trial ?? Option.none())?.outcome.status;
};

/* Typed as the union rather than inferred, so a status removed from the schema
   fails here instead of widening to string and passing. */
const EVERY_STATUS: readonly TrialStatus[] = [
  "queued",
  "running",
  "passed",
  "failed",
  "void",
];

describe("a trial's stored status", () => {
  test("closes unfinished validation evidence after crash recovery", () => {
    const original = detailWith("void");
    const validations = [
      {
        ...validationExecution(
          { id: "code:0", index: 0, name: "completed", kind: "code" },
          1000
        ),
        status: "passed" as const,
        output: validationCapture()(true),
      },
      validationExecution(
        { id: "code:1", index: 1, name: "interrupted", kind: "code" },
        1000
      ),
      {
        ...validationExecution(
          { id: "judge:0", index: 0, name: "not started", kind: "judge" },
          null
        ),
        status: "queued" as const,
      },
    ];
    const detail = {
      ...original,
      cells: original.cells.map((cell) => ({
        ...cell,
        trials: cell.trials.map((trial) => ({
          ...trial,
          validations,
          finishedAt: new Date(2000),
        })),
      })),
    };
    const trial = Option.getOrNull(
      runToState(detail).cells[0]?.trials[0] ?? Option.none()
    );
    expect(trial?.outcome.validations?.map((record) => record.status)).toEqual([
      "passed",
      "error",
      "skipped",
    ]);
    expect(trial?.outcome.validations?.[0]?.output.text).toBe("true");
  });
  test("retains judgments when reloading a finished trial", () => {
    const judgments = [
      {
        name: "correctness",
        model: "judge-model",
        evaluator: "codex",
        score: 1,
        choice: "correct",
        reason: "Matches expected",
        threshold: 1,
        durationMs: 5,
        error: null,
      },
    ];
    const original = detailWith("passed");
    const detail = {
      ...original,
      cells: original.cells.map((cell) => ({
        ...cell,
        trials: cell.trials.map((trial) => ({ ...trial, judgments })),
      })),
    };
    const trial = runToState(detail).cells[0]?.trials[0];
    expect(Option.getOrNull(trial ?? Option.none())?.outcome.judgments).toEqual(
      judgments
    );
  });
  test("survives the read for every status the product writes", () => {
    for (const status of EVERY_STATUS) {
      expect(statusRead(status)).toBe(status);
    }
  });

  /** The column is free text with no check constraint, so a row written by an
   * older deploy names a status this build cannot interpret. Void is the
   * status for a trial that is not evidence about anything -- and, unlike the
   * cast this replaced, it is a status the readers below actually branch on. */
  test("becomes void when the build cannot name it", () => {
    expect(statusRead("cancelled")).toBe("void");
  });

  /** A resume asks whether any trial is still running. A cast let an
   * unreadable status compare unequal to every branch, so a run holding live
   * work reported none and could never be picked up again. */
  test("does not pass an unreadable status off as running", () => {
    expect(statusRead("RUNNING")).not.toBe("running");
  });
});
