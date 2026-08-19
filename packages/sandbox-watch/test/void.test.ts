import { describe, expect, it } from "bun:test";
import { checkVoid } from "../src/void";

describe("void runs", () => {
  it("rejects the run that reported a perfect replication", () => {
    /* The real Daytona fingerprint: every field the same failure string, which
       an equality comparison read as agreement. */
    const failed = "fork/exec /usr/bin/zsh: no such file or directory";
    const check = checkVoid({
      commits: failed,
      files: failed,
      libContent: failed,
      testResult: failed,
    });

    expect(check.voided).toBe(true);
    expect(check.fields.length).toBe(4);
  });

  it("rejects a run where only one field failed to execute", () => {
    /* Requiring every field to be void would pass this, and it is exactly the
       run to reject: the result that decides the score is the missing one. */
    const check = checkVoid({
      commits: "fix,initial,",
      files: "lib.py,test_lib.py,",
      testResult: "fork/exec /usr/bin/zsh: no such file or directory",
    });

    expect(check.voided).toBe(true);
    expect(check.fields).toEqual(["testResult"]);
  });

  it("accepts a run that genuinely produced results", () => {
    const check = checkVoid({
      commits: "fix,initial,",
      files: "lib.py,test_lib.py,",
      testResult: "1 passed in 0.01s",
    });

    expect(check.voided).toBe(false);
  });

  it("treats an empty field as void rather than as agreement", () => {
    expect(checkVoid({ testResult: "" }).voided).toBe(true);
  });
});
