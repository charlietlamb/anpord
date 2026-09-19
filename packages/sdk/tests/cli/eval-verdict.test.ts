import { describe, expect, it } from "bun:test";
import { undecidedIn, verdictLines } from "../../src/cli/eval-verdict";

const validation = (
  name: string,
  status: string,
  message = ""
): Record<string, unknown> => ({
  calls: [],
  error: null,
  exitCode: null,
  durationMs: 1,
  id: `code:${name}`,
  index: 0,
  input: null,
  kind: "code",
  logs: [],
  message,
  name,
  output: null,
  startedAt: 0,
  status,
  truncated: false,
});

const trial = (validations: readonly Record<string, unknown>[]) =>
  ({ ordinal: 1, status: "failed", validations }) as never;

describe("what a failed trial says in the terminal", () => {
  it("names each validator and why it said so", () => {
    const lines = verdictLines(
      trial([
        validation("proPlanLive", "failed", "Pro is not live"),
        validation("appliedViaAtmn", "passed"),
      ])
    );

    expect(lines[0]).toContain("proPlanLive");
    expect(lines[0]).toContain("Pro is not live");
    expect(lines[1]).toContain("appliedViaAtmn");
  });

  /* The case that made this worth printing: every validator came back
     undecided and the run reported only "failed". */
  it("counts the validators that never decided", () => {
    const undecided = undecidedIn(
      trial([
        validation("didNotApplyBeforeReply", "skipped"),
        validation("askedBeforeApplying", "skipped"),
        validation("proPlanLive", "failed"),
      ])
    );

    expect(undecided).toHaveLength(2);
  });

  it("holds nothing for a trial that recorded no validators", () => {
    expect(verdictLines(trial([]))).toHaveLength(0);
  });
});
