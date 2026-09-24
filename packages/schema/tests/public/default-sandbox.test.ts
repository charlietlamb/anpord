import { describe, expect, it } from "bun:test";
import { Schema } from "effect";
import {
  DEFAULT_SANDBOX,
  EVAL_SANDBOXES,
  HOSTED_SANDBOXES,
} from "../../src/domain/eval-definition";
import { SuiteBatchRequest } from "../../src/public/evals-api";

const request = {
  cases: [{ id: "a-case", name: "a case", verify: "true" }],
  suite: { id: "a-suite", name: "A suite", prompt: "{{task}}" },
  trials: 1,
};

const decode = Schema.decodeUnknownSync(SuiteBatchRequest);

describe("a task's sandbox", () => {
  it("defaults when left out", () => {
    const decoded = decode({
      ...request,
      variants: [{ harness: "codex", model: "gpt-5.6-sol" }],
    });

    expect(decoded.variants[0]?.sandbox).toBe(DEFAULT_SANDBOX);
  });

  it("is kept when the caller names one", () => {
    const decoded = decode({
      ...request,
      variants: [
        { harness: "codex", model: "gpt-5.6-sol", sandbox: "daytona" },
      ],
    });

    expect(decoded.variants[0]?.sandbox).toBe("daytona");
  });
  it("is refused when it names something that does not exist", () => {
    expect(() =>
      decode({
        ...request,
        variants: [
          { harness: "codex", model: "gpt-5.6-sol", sandbox: "nowhere" },
        ],
      })
    ).toThrow();
  });
  it("offers every sandbox but the local one", () => {
    expect(EVAL_SANDBOXES).toContain("local");
    expect(HOSTED_SANDBOXES).not.toContain("local");
  });
  it("defaults to one the product offers", () => {
    expect(EVAL_SANDBOXES).toContain(DEFAULT_SANDBOX);
  });
});
