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
      "list_eval_runs",
      "list_eval_models",
      "start_eval_run",
      "get_eval_run",
      "get_eval_cell_history",
      "rerun_eval_cell",
    ])
  );
});
