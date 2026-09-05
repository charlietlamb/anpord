import { describe, expect, test } from "bun:test";
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
