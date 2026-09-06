import { describe, expect, it } from "bun:test";
import { Schema } from "effect";
import { DEFAULT_SANDBOX, EVAL_SANDBOXES } from "../../src/domain/evals";
import { PublicStartEvalRequest } from "../../src/public/evals-api";

const request = {
  cases: [{ name: "a case", verify: "true" }],
  prompt: "{{task}}",
  trials: 1,
};

const decode = Schema.decodeUnknownSync(PublicStartEvalRequest);

describe("a task's sandbox", () => {
  it("may be left out", () => {
    const decoded = decode({
      ...request,
      tasks: [{ harness: "codex", model: "gpt-5.6-sol" }],
    });

    expect(decoded.tasks[0]?.sandbox).toBeUndefined();
  });

  it("is kept when the caller names one", () => {
    const decoded = decode({
      ...request,
      tasks: [{ harness: "codex", model: "gpt-5.6-sol", sandbox: "daytona" }],
    });

    expect(decoded.tasks[0]?.sandbox).toBe("daytona");
  });

  /* Optional must not mean unchecked: a name outside the set is still a
     request the caller can fix, and it fails before any sandbox is opened. */
  it("is refused when it names something that does not exist", () => {
    expect(() =>
      decode({
        ...request,
        tasks: [{ harness: "codex", model: "gpt-5.6-sol", sandbox: "local" }],
      })
    ).toThrow();
  });

  /* The default is hashed into the cell key of every task that omits one, so
     it has to be a sandbox the product actually offers. */
  it("defaults to one the product offers", () => {
    expect(EVAL_SANDBOXES).toContain(DEFAULT_SANDBOX);
  });
});
