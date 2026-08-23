import { describe, expect, it } from "bun:test";
import { Schema } from "effect";
import { PublicStartEvalRequest } from "../../src/public/evals-api";

const request = {
  cases: [{ goal: "Fix it", name: "case", verify: "true" }],
  prompt: "{{goal}}",
  tasks: [
    { harness: "codex" as const, model: "gpt-5.6-sol", provider: "upstash" },
  ],
  trials: 1,
};

describe("the public eval provider contract", () => {
  for (const provider of [
    "upstash",
    "modal",
    "cloudflare",
    "vercel",
  ] as const) {
    it(`accepts ${provider}`, () => {
      const value = {
        ...request,
        tasks: [{ ...request.tasks[0], provider }],
      };
      expect(Schema.decodeUnknownSync(PublicStartEvalRequest)(value)).toEqual(
        value
      );
    });
  }

  it("continues to reject the unisolated local provider", () => {
    expect(() =>
      Schema.decodeUnknownSync(PublicStartEvalRequest)({
        ...request,
        tasks: [{ ...request.tasks[0], provider: "local" }],
      })
    ).toThrow();
  });
});
