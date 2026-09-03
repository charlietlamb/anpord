import { describe, expect, test } from "bun:test";
import { reportsModel } from "../../src/domain/harness-models";

describe("whether a harness ran the model it was asked for", () => {
  test("the same id is the same model", () => {
    expect(reportsModel("claude-sonnet-5", "claude-sonnet-5")).toBe(true);
  });

  /* The static catalogue offers `sonnet`, `opus` and `haiku`, and Claude Code
     reports the member of the family it resolved the alias to. Refusing that
     failed every documented run at its first event. */
  test("an alias is matched by the family it names", () => {
    expect(reportsModel("sonnet", "claude-sonnet-5")).toBe(true);
    expect(reportsModel("opus", "claude-opus-4-8")).toBe(true);
  });

  test("a different family is a different model", () => {
    expect(reportsModel("opus", "claude-sonnet-5")).toBe(false);
    expect(reportsModel("claude-opus-4-8", "claude-opus-4-7")).toBe(false);
  });
});
