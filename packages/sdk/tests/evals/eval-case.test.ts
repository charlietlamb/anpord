import { describe, expect, it } from "bun:test";
import { evalCase, sourceUrlOf } from "../../src/evals/define";

const tasks = [{ harness: "codex" as const, model: "m" }];

describe("a single case", () => {
  it("reads as a suite of one", () => {
    const definition = evalCase({
      name: "writes hello",
      prompt: "Create hello.txt",
      tasks,
      trials: 3,
      verify: "test -f hello.txt",
    });

    expect(definition.name).toBe("writes hello");
    expect(definition.cases).toHaveLength(1);
    expect(definition.cases[0]?.name).toBe("writes hello");
    expect(definition.trials).toBe(3);
  });

  /* The prompt belongs to the suite and the rest to the case, so neither
     carries a field the other owns. */
  it("keeps the prompt out of the case it wraps", () => {
    const definition = evalCase({
      name: "writes hello",
      prompt: "Create hello.txt",
      tasks,
      trials: 1,
      verify: "test -f hello.txt",
    });

    expect(definition.prompt).toBe("Create hello.txt");
    expect("prompt" in (definition.cases[0] ?? {})).toBe(false);
  });

  it("carries tags to the case", () => {
    const definition = evalCase({
      name: "writes hello",
      prompt: "Create hello.txt",
      tags: ["billing"],
      tasks,
      trials: 1,
      verify: "test -f hello.txt",
    });

    expect(definition.cases[0]?.tags).toEqual(["billing"]);
  });

  /* Compiling re-imports the file a suite was written in, so the helper has to
     report its caller rather than the module it is defined in. */
  it("records the file that declared it", () => {
    const definition = evalCase({
      name: "writes hello",
      prompt: "Create hello.txt",
      tasks,
      trials: 1,
      verify: "test -f hello.txt",
    });

    expect(sourceUrlOf(definition)).toContain("eval-case.test.ts");
  });
});
