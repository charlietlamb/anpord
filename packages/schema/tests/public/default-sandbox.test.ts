import { describe, expect, it } from "bun:test";
import { Schema } from "effect";
import {
  DEFAULT_SANDBOX,
  EVAL_SANDBOXES,
  HOSTED_SANDBOXES,
} from "../../src/domain/evals";
import { PublicStartEvalRequest } from "../../src/public/evals-api";

const request = {
  cases: [{ id: "a-case", name: "a case", verify: "true" }],
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
        tasks: [{ harness: "codex", model: "gpt-5.6-sol", sandbox: "nowhere" }],
      })
    ).toThrow();
  });

  /* The domain knows `local` so a developer can run one on their own machine.
     The hosted contract is where that stops, so the two lists differ by it. */
  it("offers every sandbox but the local one", () => {
    expect(EVAL_SANDBOXES).toContain("local");
    expect(HOSTED_SANDBOXES).not.toContain("local");
  });

  /* The default is hashed into the cell key of every task that omits one, so
     it has to be a sandbox the product actually offers. */
  it("defaults to one the product offers", () => {
    expect(EVAL_SANDBOXES).toContain(DEFAULT_SANDBOX);
  });
});
