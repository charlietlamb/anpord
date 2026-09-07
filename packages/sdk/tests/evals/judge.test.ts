import { describe, expect, test } from "bun:test";
import { judge } from "../../src/validators";

const options = {
  name: "correctness",
  harness: "codex" as const,
  model: "chosen-model",
  prompt: "The answer matches the expected result.",
  choices: { correct: 1, incorrect: 0 },
};

describe("judge", () => {
  test("keeps the exact model and supplies bounded defaults", () => {
    expect(judge(options)).toEqual({
      ...options,
      kind: "judge",
      threshold: 1,
      timeoutMs: 120_000,
    });
  });

  test.each([
    { choices: {} },
    { choices: { incorrect: -1 } },
    { choices: { correct: 2 } },
    { threshold: 1.1 },
    { model: "" },
    { prompt: "" },
    { prompt: undefined },
    { rubric: "Old field" },
    { timeoutMs: 0 },
    { harness: "command" },
    { provider: "openai" },
    { unexpected: true },
  ])("rejects invalid configuration %j", (invalid) => {
    expect(() =>
      judge({ ...options, ...invalid } as Parameters<typeof judge>[0])
    ).toThrow();
  });

  test("supports a direct model provider", () => {
    const { harness: _, ...shared } = options;
    expect(judge({ ...shared, provider: "openai" }).model).toBe("chosen-model");
  });

  test("limits the judge prompt to 32,000 characters", () => {
    expect(
      judge({ ...options, prompt: "x".repeat(32_000) }).prompt
    ).toHaveLength(32_000);
    expect(() => judge({ ...options, prompt: "x".repeat(32_001) })).toThrow();
  });
});
