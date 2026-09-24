import { describe, expect, it } from "bun:test";
import { Schema } from "effect";
import { PublicStartBatchRequest } from "../../src/public/evals-api";

const decode = Schema.decodeUnknownSync(PublicStartBatchRequest);

const request = {
  cases: [
    {
      id: "a-case",
      name: "case",
      variables: { task: "Fix it" },
      verify: "true",
    },
  ],
  suite: { id: "planner-core", name: "Planner core", prompt: "{{task}}" },
  trials: 1,
  variants: [
    { harness: "codex" as const, model: "gpt-5.6-sol", sandbox: "upstash" },
  ],
};

describe("starting a batch", () => {
  it("fills in what a case may leave out", () => {
    const [first] = decode(request).cases;

    expect(first?.source).toEqual({ kind: "empty" });
    expect(first?.prepare).toBeNull();
    expect(first?.validator).toBeNull();
    expect(first?.tags).toEqual([]);
  });

  it("keeps the suite a case belongs to", () => {
    expect(decode(request).suite).toEqual(request.suite);
  });

  for (const sandbox of ["upstash", "modal", "cloudflare", "vercel"] as const) {
    it(`accepts ${sandbox}`, () => {
      const decoded = decode({
        ...request,
        variants: [{ ...request.variants[0], sandbox }],
      });
      expect(decoded.variants[0]?.sandbox).toBe(sandbox);
    });
  }

  it("rejects the local sandbox unless the caller runs the batch", () => {
    const local = {
      ...request,
      variants: [{ ...request.variants[0], sandbox: "local" }],
    };

    expect(() => decode(local)).toThrow();
    expect(decode({ ...local, local: true }).local).toBe(true);
  });

  it("accepts a bundled validator instead of a shell verifier", () => {
    const decoded = decode({
      ...request,
      cases: [
        {
          id: "a-case",
          name: "case",
          validator: { name: "validateFix", source: "bundled JavaScript" },
          verify: null,
        },
      ],
    });

    expect(decoded.cases[0]?.validator?.name).toBe("validateFix");
  });

  it("rejects a case with both a validator and verifier", () => {
    expect(() =>
      decode({
        ...request,
        cases: [
          {
            id: "a-case",
            name: "case",
            validator: { name: "validateFix", source: "bundled JavaScript" },
            verify: "true",
          },
        ],
      })
    ).toThrow("Use either validator or verify, not both");
  });

  it("rejects a suite id that is not a handle", () => {
    expect(() =>
      decode({ ...request, suite: { ...request.suite, id: "Not A Handle" } })
    ).toThrow();
  });
});
