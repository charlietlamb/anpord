import { describe, expect, it } from "bun:test";
import type { PublicStartEvalRequest } from "@anpord/schema/public/evals-api";
import { tooLargeToSubmit } from "./request-size";

const requestOf = (cases: number, bytesEach: number) =>
  ({
    cases: Array.from({ length: cases }, (_, index) => ({
      name: `case-${index}`,
      validator: { source: "x".repeat(bytesEach) },
    })),
    name: "suite",
    prompt: "p",
    tasks: [],
    trials: 1,
  }) as unknown as PublicStartEvalRequest;

describe("a suite too large to submit", () => {
  it("passes a suite the gateway will accept", () => {
    expect(tooLargeToSubmit(requestOf(3, 200_000))).toBeNull();
  });

  /* The gateway answers an oversized body with a bare 413, so the message has
     to say what to do rather than only that something was too big. */
  it("names the size, the limit and how far to split", () => {
    const message = tooLargeToSubmit(requestOf(6, 700_000));

    expect(message).toContain("over the 3.5MB");
    expect(message).toContain("6 cases");
    expect(message).toContain("at most 5");
  });

  it("still asks for one case per suite when a single case is too big", () => {
    expect(tooLargeToSubmit(requestOf(1, 5_000_000))).toContain("at most 1");
  });

  /* Mocks are bundled once per task, so a wide grid is too big because of its
     harnesses rather than its cases, and splitting by case would not help. */
  it("blames the tasks when they carry the weight", () => {
    const request = {
      cases: [{ name: "c", validator: { source: "x" } }],
      name: "grid",
      prompt: "p",
      tasks: Array.from({ length: 8 }, () => ({
        profile: { files: { mock: "y".repeat(600_000) } },
      })),
      trials: 1,
    } as unknown as PublicStartEvalRequest;

    expect(tooLargeToSubmit(request)).toContain("8 tasks");
  });
});
