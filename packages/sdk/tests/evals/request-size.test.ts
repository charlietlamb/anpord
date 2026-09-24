import { describe, expect, it } from "bun:test";
import type { StartBatchRequest } from "@anpord/schema/domain/evals";
import { tooLargeToSubmit } from "../../src/evals/request-size";

const requestOf = (cases: number, bytesEach: number) =>
  ({
    cases: Array.from({ length: cases }, (_, index) => ({
      name: `case-${index}`,
      validator: { source: "x".repeat(bytesEach) },
    })),
    suite: { id: "suite", name: "suite", prompt: "p" },
    variants: [],
    trials: 1,
  }) as unknown as StartBatchRequest;

describe("a suite too large to submit", () => {
  it("passes a suite the gateway will accept", () => {
    expect(tooLargeToSubmit(requestOf(3, 200_000))).toBeNull();
  });

  it("names the size, the limit and how far to split", () => {
    const message = tooLargeToSubmit(requestOf(6, 700_000));

    expect(message).toContain("over the 3.5MB");
    expect(message).toContain("6 cases");
    expect(message).toContain("at most 5");
  });

  it("still asks for one case per suite when a single case is too big", () => {
    expect(tooLargeToSubmit(requestOf(1, 5_000_000))).toContain("at most 1");
  });

  it("blames the variants when they carry the weight", () => {
    const request = {
      cases: [{ id: "c", name: "c", validator: { source: "x" } }],
      suite: { id: "grid", name: "grid", prompt: "p" },
      variants: Array.from({ length: 8 }, () => ({
        profile: { files: { mock: "y".repeat(600_000) } },
      })),
      trials: 1,
    } as unknown as StartBatchRequest;

    expect(tooLargeToSubmit(request)).toContain("8 variants");
  });
});
