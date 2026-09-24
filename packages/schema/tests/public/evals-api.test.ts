import { describe, expect, it } from "bun:test";
import { Schema } from "effect";
import { RunCaseRequest } from "../../src/domain/run-case";
import {
  RunCaseBatchRequest,
  SuiteBatchRequest,
} from "../../src/public/evals-api";

const decode = Schema.decodeUnknownSync(SuiteBatchRequest);

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

  it("rejects the local sandbox, even when the caller asks to run it", () => {
    const local = {
      ...request,
      variants: [{ ...request.variants[0], sandbox: "local" }],
    };

    expect(() => decode(local)).toThrow("anpord eval --local");
    expect(() => decode({ ...local, local: true })).toThrow(
      "anpord eval --local"
    );
  });

  it("takes no say over where the batch runs", () => {
    expect(decode({ ...request, local: true })).not.toHaveProperty("local");
    expect(() =>
      Schema.decodeUnknownSync(SuiteBatchRequest)(
        { ...request, local: true },
        { onExcessProperty: "error" }
      )
    ).toThrow();
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
    ).toThrow("A case has either a validator or a command, not both.");
  });

  it("rejects a suite id that is not a handle", () => {
    expect(() =>
      decode({ ...request, suite: { ...request.suite, id: "Not A Handle" } })
    ).toThrow();
  });
});

describe("running a case again", () => {
  it("runs once when trials are left out", () => {
    expect(Schema.decodeUnknownSync(RunCaseRequest)({})).toEqual({ trials: 1 });
  });

  it("names the variants to run on", () => {
    expect(
      Schema.decodeUnknownSync(RunCaseBatchRequest)({
        id: "a-case",
        variants: ["evar_one", "evar_two"],
      })
    ).toEqual({ id: "a-case", trials: 1, variants: ["evar_one", "evar_two"] });
  });

  it("refuses an empty list of variants", () => {
    expect(() =>
      Schema.decodeUnknownSync(RunCaseRequest)({ variants: [] })
    ).toThrow();
  });
});

describe("a name", () => {
  it("defaults to the id for a suite and a case", () => {
    const decoded = decode({
      ...request,
      cases: [{ id: "a-case", verify: "true" }],
      suite: { id: "planner-core", prompt: "{{task}}" },
    });

    expect(decoded.suite.name).toBe("planner-core");
    expect(decoded.cases[0]?.name).toBe("a-case");
  });

  it("keeps the name it is given", () => {
    expect(decode(request).cases[0]?.name).toBe("case");
  });
});
