import { describe, expect, it } from "bun:test";
import { Schema } from "effect";
import { RunnerBatchRequest } from "../../src/public/runner-api";

const decode = Schema.decodeUnknownSync(RunnerBatchRequest);

const request = {
  cases: [{ id: "a-case", name: "case", verify: "true" }],
  suite: { id: "planner-core", name: "Planner core", prompt: "Fix it" },
  trials: 1,
  variants: [{ harness: "codex" as const, model: "gpt-5.6-sol" }],
};

const local = {
  ...request,
  variants: [{ ...request.variants[0], sandbox: "local" }],
};

describe("a batch the CLI starts", () => {
  it("runs the local sandbox only when the caller runs it", () => {
    expect(() => decode(local)).toThrow();
    expect(decode({ ...local, local: true }).local).toBe(true);
  });

  it("keeps the trigger the CLI reports", () => {
    expect(decode({ ...request, trigger: { source: "ci" } }).trigger).toEqual({
      source: "ci",
    });
  });

  it("refuses a case with both a validator and a command", () => {
    expect(() =>
      decode({
        ...request,
        cases: [
          {
            ...request.cases[0],
            validator: { name: "check", source: "bundled" },
          },
        ],
      })
    ).toThrow("A case has either a validator or a command, not both.");
  });
});
