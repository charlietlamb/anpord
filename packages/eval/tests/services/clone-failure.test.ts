import { describe, expect, test } from "bun:test";
import { cloneFailureReason } from "../../src/services/clone-failure";

const URL = "https://github.com/acme/repo.git";

describe("cloneFailureReason", () => {
  test("a repository the sandbox cannot read names both reasons it might not", () => {
    const reason = cloneFailureReason(
      URL,
      null,
      "Cloning into 'w'...\nfatal: could not read Username for 'https://github.com': terminal prompts disabled\n",
      128
    );

    expect(reason).toContain("does not exist");
    expect(reason).toContain("GitHub app is not installed");
  });

  test("a missing repository reads the same, because GitHub answers both alike", () => {
    const reason = cloneFailureReason(
      URL,
      null,
      "fatal: repository 'https://github.com/acme/repo.git/' not found\n",
      128
    );

    expect(reason).toContain("does not exist");
  });

  test("an unreachable ref is reported against the ref", () => {
    const reason = cloneFailureReason(
      URL,
      "deadbeef",
      "fatal: remote error: upload-pack: not our ref deadbeef\n",
      128
    );

    expect(reason).toContain("has no ref deadbeef");
  });

  test("a ref named in the failure is about the ref, whatever the wording", () => {
    const reason = cloneFailureReason(
      URL,
      "abc123",
      "error: pathspec 'abc123' did not match any file(s) known to git\n",
      128
    );

    expect(reason).toContain("has no ref abc123");
  });

  test("a run that pinned a ref still reports access when access is the problem", () => {
    const reason = cloneFailureReason(
      URL,
      "abc123",
      "fatal: could not read Username for 'https://github.com': terminal prompts disabled\n",
      128
    );

    expect(reason).toContain("does not exist");
    expect(reason).not.toContain("has no ref");
  });

  test("a host that does not resolve is not reported as a permission problem", () => {
    const reason = cloneFailureReason(
      "https://nope.invalid/x.git",
      null,
      "fatal: unable to access 'https://nope.invalid/x.git/': Could not resolve host: nope.invalid\n",
      128
    );

    expect(reason).toContain("Could not reach");
  });

  test("an unrecognised failure carries git's own last line", () => {
    const reason = cloneFailureReason(
      URL,
      null,
      "Cloning into 'w'...\nfatal: something nobody predicted\n",
      128
    );

    expect(reason).toContain("fatal: something nobody predicted");
  });

  test("a silent failure still names the status", () => {
    expect(cloneFailureReason(URL, null, "", 1)).toContain("status 1");
  });
});
