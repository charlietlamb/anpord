import { describe, expect, it } from "bun:test";
import { Schema } from "effect";
import { PublicStartEvalRequest } from "../../src/public/evals-api";

const request = {
  cases: [{ variables: { task: "Fix it" }, name: "case", verify: "true" }],
  name: "planner-core",
  prompt: "{{task}}",
  tasks: [
    { harness: "codex" as const, model: "gpt-5.6-sol", sandbox: "upstash" },
  ],
  trials: 1,
};

describe("the public eval task contract", () => {
  it("accepts an eval name", () => {
    expect(Schema.decodeUnknownSync(PublicStartEvalRequest)(request)).toEqual(
      request
    );
  });

  it("continues to accept older unnamed clients", () => {
    const { name: _, ...unnamed } = request;

    expect(Schema.decodeUnknownSync(PublicStartEvalRequest)(unnamed)).toEqual(
      unnamed
    );
  });

  for (const sandbox of ["upstash", "modal", "cloudflare", "vercel"] as const) {
    it(`accepts ${sandbox}`, () => {
      const value = {
        ...request,
        tasks: [{ ...request.tasks[0], sandbox }],
      };
      expect(Schema.decodeUnknownSync(PublicStartEvalRequest)(value)).toEqual(
        value
      );
    });
  }

  it("continues to reject the unisolated local sandbox", () => {
    expect(() =>
      Schema.decodeUnknownSync(PublicStartEvalRequest)({
        ...request,
        tasks: [{ ...request.tasks[0], sandbox: "local" }],
      })
    ).toThrow();
  });
});

describe("TypeScript validators", () => {
  it("accepts a bundled validator instead of a shell verifier", () => {
    const value = {
      ...request,
      cases: [
        {
          variables: { task: "Fix it" },
          name: "case",
          validator: { name: "validateFix", source: "bundled JavaScript" },
          verify: null,
        },
      ],
    };

    expect(Schema.decodeUnknownSync(PublicStartEvalRequest)(value)).toEqual(
      value
    );
  });

  it("rejects a case with both a validator and verifier", () => {
    expect(() =>
      Schema.decodeUnknownSync(PublicStartEvalRequest)({
        ...request,
        cases: [
          {
            variables: { task: "Fix it" },
            name: "case",
            validator: { name: "validateFix", source: "bundled JavaScript" },
            verify: "true",
          },
        ],
      })
    ).toThrow("Use either validator or verify, not both");
  });
});
