import { describe, expect, test } from "bun:test";
import { apiOperations, commandNames } from "../../src/cli/coverage";

const EVAL_COMMANDS: Record<string, readonly string[]> = {
  "batches.get": [],
  "batches.list": [],
  "batches.start": [],
  "cases.get": [],
  "cases.list": [],
  "cases.run": [],
  "connectors.add": ["connectors"],
  "connectors.integrations": [],
  "connectors.list": [],
  "connectors.remove": [],
  "models.list": [],
  "runner.finish": [],
  "runner.lease": [],
  "runner.report": [],
  "runner.start": ["eval"],
  "runner.subscribe": [],
  "runner.tail": [],
  "runs.get": [],
  "runs.list": [],
  "suites.get": [],
  "suites.list": [],
};

const PROMPT_COMMANDS: Record<string, readonly string[]> = {
  "prompts.create": [],
  "prompts.get": ["generate", "get", "versions"],
  "prompts.list": ["list"],
  "prompts.promote": ["promote"],
  "prompts.update": ["push"],
};

const mapped = (operations: Record<string, readonly string[]>) =>
  Object.values(operations).flat().toSorted();

describe("coverage", () => {
  test("every operation the api exposes has a decision recorded here", () => {
    expect(
      Object.keys({ ...EVAL_COMMANDS, ...PROMPT_COMMANDS }).toSorted()
    ).toEqual(apiOperations());
  });

  test("with prompts off, only eval and connector commands exist", () => {
    expect(commandNames(false)).toEqual(mapped(EVAL_COMMANDS));
  });

  test("with prompts on, every command maps to an operation", () => {
    expect(commandNames(true)).toEqual(
      mapped({ ...EVAL_COMMANDS, ...PROMPT_COMMANDS })
    );
  });

  test("with prompts on, reading and publishing are reachable from the terminal", () => {
    for (const operation of [
      "prompts.get",
      "prompts.list",
      "prompts.update",
      "prompts.promote",
    ]) {
      expect(PROMPT_COMMANDS[operation]).not.toBeEmpty();
    }
  });
});
