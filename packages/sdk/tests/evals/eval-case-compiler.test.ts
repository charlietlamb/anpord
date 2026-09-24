import { afterEach, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compileEval } from "../../src/evals/compiler";

let workspace: string | undefined;
afterEach(async () => {
  if (workspace) {
    await rm(workspace, { recursive: true, force: true });
  }
});

test("compiles a case that stands without a suite", async () => {
  workspace = await mkdtemp(join(tmpdir(), "anpord-eval-case-"));
  const entry = join(workspace, "eval.ts");
  await writeFile(
    entry,
    `
import { evalCase, empty } from "anpord";
export default evalCase({ id: "answers", name: "answers", source: empty, prompt: "Answer", trials: 1,
  variants: [{ harness: "codex", model: "task-model" }],
  validate: () => true,
});`
  );

  const compiled = await compileEval(entry);

  expect(compiled.cases.map((subject) => subject.name)).toEqual(["answers"]);
  expect(compiled.suite).toEqual({
    id: "answers",
    name: "answers",
    prompt: "Answer",
  });
  expect(compiled.cases[0]?.validator).toBeDefined();
});
