import { expect, test } from "bun:test";
import { register } from "../src/tools";

test("registers the public eval workflow", () => {
  const names: string[] = [];
  const server = {
    tool: (definition: { readonly name: string }) =>
      names.push(definition.name),
  };

  register(server as never);

  expect(names).toEqual(
    expect.arrayContaining([
      "list_eval_batches",
      "list_eval_models",
      "start_eval_batch",
      "get_eval_batch",
      "list_case_runs",
      "run_eval_case",
    ])
  );
});
