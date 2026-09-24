import { describe, expect, it } from "bun:test";
import type { EvalTrialStatus } from "@anpord/schema/domain/evals";
import { decodeTrialStatus } from "@anpord/schema/domain/trial";
import { Option } from "effect";
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
    expect(outcome.voidFields).toEqual([]);
  });

  it("fails when the verifier exits non-zero", () => {
    const outcome = outcomeOf({
      ...base,
      exitCode: 1,
      fingerprint: { tests: "1 fail" },
    });

    expect(outcome.status).toBe("failed");
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

  it("never reports a pass for a voided trial", () => {
    const outcome = outcomeOf({
      ...base,
      exitCode: 0,
      fingerprint: { tests: "command not found" },
    });

    expect(outcome.status).not.toBe("passed");
    expect(outcome.status).toBe("void");
  });
});

describe("the void gate and quiet commands", () => {
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

describe("configured void patterns", () => {
  it("voids on a signature supplied per deployment", () => {
    const fingerprint = { stdout: "Sandbox pool exhausted, nothing ran" };

    expect(outcomeOf({ ...base, fingerprint }).status).toBe("passed");
    expect(
      outcomeOf({
        ...base,
        fingerprint,
        voidPatterns: ["sandbox pool exhausted"],
      }).status
    ).toBe("void");
  });

  it("ignores a pattern that will not compile", () => {
    const outcome = outcomeOf({
      ...base,
      fingerprint: { stdout: "ordinary output" },
      voidPatterns: ["(unclosed"],
    });

    expect(outcome.status).toBe("passed");
  });
});

const EVERY_STATUS: readonly EvalTrialStatus[] = [
  "queued",
  "running",
  "passed",
  "failed",
  "void",
];

describe("decodeTrialStatus", () => {
  it("reads back every status the product writes", () => {
    for (const status of EVERY_STATUS) {
      expect(decodeTrialStatus(status)).toEqual(Option.some(status));
    }
  });

  it("refuses a status it does not name", () => {
    for (const status of ["RUNNING", "in_progress", "", "cancelled"]) {
      expect(decodeTrialStatus(status)).toEqual(Option.none());
    }
  });
});
