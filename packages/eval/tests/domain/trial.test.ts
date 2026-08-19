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
    const outcome = outcomeOf({ ...base, fingerprint: { tests: "1 pass" } });

    expect(outcome.status).toBe("passed");
    expect(outcome.passed).toBe(true);
    expect(outcome.voidFields).toEqual([]);
  });

  it("fails when the verifier exits non-zero", () => {
    const outcome = outcomeOf({
      ...base,
      exitCode: 1,
      fingerprint: { tests: "1 fail" },
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

describe("the void gate and quiet commands", () => {
  /* A regression: E2B returns an empty stdout for a failing test run, so a
     fingerprint built from raw output matched the empty-string void pattern
     and threw away a legitimate failure. The gate must ask whether the command
     ran, not whether it printed. */
  it("does not void a command that ran quietly", () => {
    const outcome = outcomeOf({
      commandCount: 2,
      exitCode: 1,
      fingerprint: { verify: "exited 1" },
      modelMs: 0,
      sandboxMs: 900,
    });

    expect(outcome.status).toBe("failed");
    expect(outcome.voidFields).toEqual([]);
  });

  it("still voids a command that produced nothing at all", () => {
    const outcome = outcomeOf({
      commandCount: 0,
      exitCode: 1,
      fingerprint: { verify: "" },
      modelMs: 0,
      sandboxMs: 12,
    });

    expect(outcome.status).toBe("void");
  });
});

describe("a verifier that tested nothing", () => {
  /* The worst failure this system can have. A runner that finds no tests
     exits zero and says so, and scoring that as a pass reports a cell where
     the workspace was empty as passing every trial, deterministically. */
  it("voids a run that found no tests rather than passing it", () => {
    const outcome = outcomeOf({
      commandCount: 3,
      exitCode: 0,
      fingerprint: {
        verify: "ℹ tests 0\nℹ suites 0\nℹ pass 0\nℹ fail 0\n",
      },
      modelMs: 100,
      sandboxMs: 100,
    });

    expect(outcome.status).toBe("void");
    expect(outcome.passed).toBe(false);
    expect(outcome.voidFields).toEqual(["verify"]);
  });

  it("voids other runners that say the same thing", () => {
    for (const output of [
      "No tests found",
      "0 tests, 0 assertions",
      "no tests to run",
    ]) {
      expect(
        outcomeOf({
          commandCount: 1,
          exitCode: 0,
          fingerprint: { verify: output },
          modelMs: 0,
          sandboxMs: 0,
        }).status
      ).toBe("void");
    }
  });

  it("still passes a run that actually tested something", () => {
    const outcome = outcomeOf({
      commandCount: 3,
      exitCode: 0,
      fingerprint: {
        verify: "ℹ tests 1\nℹ pass 1\nℹ fail 0\n",
      },
      modelMs: 100,
      sandboxMs: 100,
    });

    expect(outcome.status).toBe("passed");
  });
});
