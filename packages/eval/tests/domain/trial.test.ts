import { describe, expect, it } from "bun:test";
import { outcomeOf } from "../../src/domain/trial";

const base = {
  commandCount: 9,
  exitCode: 0,
  modelMs: 1200,
  sandboxMs: 340,
};

describe("outcomeOf", () => {
  it("passes when the verifier exits zero", () => {
    const outcome = outcomeOf({ ...base, fingerprint: { tests: "1 passed" } });

    expect(outcome.status).toBe("passed");
    expect(outcome.passed).toBe(true);
    expect(outcome.voidFields).toEqual([]);
  });

  it("fails when the verifier exits non-zero", () => {
    const outcome = outcomeOf({
      ...base,
      exitCode: 1,
      fingerprint: { tests: "1 failed" },
    });

    expect(outcome.status).toBe("failed");
    expect(outcome.passed).toBe(false);
  });

  it("voids the run that never ran, rather than failing it", () => {
    const outcome = outcomeOf({
      ...base,
      exitCode: -1,
      fingerprint: {
        files: "fork/exec /usr/bin/zsh: no such file or directory",
        tests: "fork/exec /usr/bin/zsh: no such file or directory",
      },
    });

    expect(outcome.status).toBe("void");
    expect(outcome.voidFields).toEqual(["files", "tests"]);
  });

  /* The bug this gate exists for: two identical error strings once read as
     perfect agreement, reporting a flawless score for a provider where
     nothing had executed. */
  it("never reports a pass for a voided trial", () => {
    const outcome = outcomeOf({
      ...base,
      exitCode: 0,
      fingerprint: { tests: "command not found" },
    });

    expect(outcome.passed).toBe(false);
    expect(outcome.status).toBe("void");
  });
});
