import { describe, expect, test } from "bun:test";
import { compileDefinition } from "../../src/evals/compiler";
import { suite } from "../../src/evals/define";
import { smoke } from "./fixtures/named.eval";

const NOT_EXPORTED = /is not exported from/;

describe("compiling an imported definition", () => {
  test("finds the file and the export it was written in", async () => {
    const request = await compileDefinition(smoke);

    expect(request.prompt).toBe("Create hello.txt");
    expect(request.tasks[0]?.harness).toBe("codex");
    expect(request.cases[0]?.name).toBe("writes hello");
  });

  test("bundles the validator with what it closes over", async () => {
    const request = await compileDefinition(smoke);
    const validator = request.cases[0]?.validator;

    expect(validator).toBeDefined();
    expect(
      validator && "source" in validator ? validator.source : ""
    ).toContain("hello");
  });

  /* A suite finds its own file, so the remaining failure is a definition
     that file never exported: there is no name to import it back by. */
  test("says so when the eval is not exported from its file", async () => {
    const orphan = suite({
      name: "orphan",
      prompt: "x",
      tasks: [{ harness: "codex", model: "m" }],
      trials: 1,
      cases: [{ name: "a", verify: "true" }],
    });

    await expect(compileDefinition(orphan)).rejects.toThrow(NOT_EXPORTED);
  });
});
