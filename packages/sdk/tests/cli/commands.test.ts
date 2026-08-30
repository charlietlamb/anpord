import { describe, expect, test } from "bun:test";
import { apiOperations, commandNames } from "../../src/cli/coverage";

const OPERATION_COMMANDS: Record<string, readonly string[]> = {
  "evals.cellHistory": [],
  "evals.get": [],
  "evals.list": [],
  "evals.models": [],
  "evals.rerunCell": [],
  "evals.start": ["eval"],
  "prompts.create": [],
  "prompts.get": ["gen", "generate", "get", "versions"],
  "prompts.list": ["list"],
  "prompts.promote": ["promote"],
  "prompts.update": ["push"],
};

describe("coverage", () => {
  test("every operation the api exposes has a decision recorded here", () => {
    expect(Object.keys(OPERATION_COMMANDS).toSorted()).toEqual(apiOperations());
  });

  test("every command maps to an operation", () => {
    const mapped = Object.values(OPERATION_COMMANDS).flat().toSorted();
    expect(commandNames()).toEqual(mapped);
  });

  test("reading and publishing are reachable from the terminal", () => {
    for (const operation of [
      "prompts.get",
      "prompts.list",
      "prompts.update",
      "prompts.promote",
    ]) {
      expect(OPERATION_COMMANDS[operation]).not.toBeEmpty();
    }
  });
});
