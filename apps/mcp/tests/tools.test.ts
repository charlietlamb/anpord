import { describe, expect, test } from "bun:test";
import { register, serverDescription } from "../src/tools";

const EVAL_TOOLS = [
  "start_suite_batch",
  "start_case_batch",
  "get_batch",
  "list_batches",
  "list_cases",
  "get_case",
  "list_runs",
  "get_run",
  "list_models",
];

const PROMPT_TOOLS = [
  "get_prompt",
  "list_prompts",
  "list_versions",
  "update_prompt",
  "promote_prompt",
];

const registered = (prompts: boolean) => {
  const names: string[] = [];
  const server = {
    tool: (definition: { readonly name: string }) =>
      names.push(definition.name),
  };

  register(server as never, prompts);

  return names;
};

describe("tools", () => {
  test("registers the eval workflow and nothing else when prompts are off", () => {
    expect(registered(false)).toEqual(EVAL_TOOLS);
  });

  test("adds the prompt tools when prompts are on", () => {
    expect(registered(true)).toEqual([...EVAL_TOOLS, ...PROMPT_TOOLS]);
  });

  test("the description only offers prompts when they are on", () => {
    expect(serverDescription(false)).not.toContain("prompt");
    expect(serverDescription(true)).toContain("versioned prompts");
  });
});
