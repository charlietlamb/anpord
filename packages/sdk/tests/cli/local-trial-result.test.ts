import { describe, expect, it } from "bun:test";
import { PrepareFailed, TrialTimedOut } from "@anpord/eval/domain/errors";
import { Cause } from "effect";
import {
  brokenBy,
  localCaseOf,
  reportRequest,
  verdictOf,
} from "../../src/cli/local-trial-result";
import { verdictLines } from "../../src/cli/transcript-verdict";
import { PLAIN, writerFor } from "../../src/cli/transcript-writer";

const timedOut = brokenBy(
  Cause.fail(new TrialTimedOut({ timeoutMs: 1000 })),
  1400,
  []
);
const setupBroke = brokenBy(
  Cause.fail(
    new PrepareFailed({ name: "seeds-data", reason: "no database at :5432" })
  ),
  300,
  []
);
const trial = { name: "retries", ordinal: 2, variant: "codex/luna" };

describe("a local trial that could not finish", () => {
  it("is timed out when it ran past its limit, with the limit as the reason", () => {
    expect(localCaseOf(timedOut, trial)).toEqual({
      durationMs: 1400,
      name: "retries",
      ordinal: 2,
      reason: "The agent ran past its time limit of 1s",
      status: "timed out",
      commands: 0,
      usage: null,
      variant: "codex/luna",
    });
    expect(verdictOf(timedOut)).toEqual({
      failure: "The agent ran past its time limit of 1s",
      status: "timed out",
      verifySteps: [],
      voidFields: [],
    });
    expect(verdictLines(verdictOf(timedOut), writerFor(PLAIN)).at(-1)).toBe(
      "  └ ○ timed out · The agent ran past its time limit of 1s"
    );
  });

  it("is void when its setup broke, and is reported with why", () => {
    expect(localCaseOf(setupBroke, trial).status).toBe("void");
    expect(reportRequest(setupBroke, 2, "run_1")).toEqual({
      payload: {
        events: [],
        failure: "no database at :5432",
        ordinal: 2,
        runId: "run_1",
        sandboxId: null,
        usage: null,
      },
    });
  });
});
