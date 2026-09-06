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

const compile = async (validate: string) => {
  workspace = await mkdtemp(join(tmpdir(), "anpord-judged-"));
  const entry = join(workspace, "eval.ts");
  await writeFile(
    entry,
    `
import { defineEval, empty } from "anpord";
import { judge } from "anpord/validators";
const correctness = judge({ name: "correctness", harness: "codex", model: "exact-model", rubric: "Matches expected", choices: { correct: 1, incorrect: 0 } });
export default defineEval({ name: "judged", source: empty, prompt: "Answer", trials: 1,
  tasks: [{ harness: "codex", model: "task-model", provider: "e2b" }],
  cases: [{ name: "answer", validate: ${validate} }],
});`
  );
  return (await compileEval(entry)).cases[0]?.validator;
};

test("compiles a judge without a code check", async () => {
  expect(await compile("correctness")).toMatchObject({
    kind: "judged",
    checks: [],
    judges: [{ model: "exact-model" }],
  });
});

test("bundles inline code checks alongside a judge", async () => {
  const validator = await compile(
    '[() => true, correctness, () => ({ passed: false, message: "Missing fact" })]'
  );
  if (!validator || "source" in validator || !workspace) {
    throw new Error("Expected a judged validator");
  }
  const script = join(workspace, "check.mjs");
  await writeFile(script, validator.checks[0]?.source ?? "");
  const process = Bun.spawn(["node", script], { cwd: workspace });
  const output = await new Response(process.stdout).text();
  expect(await process.exited).toBe(0);
  expect(output).toContain('"passed":false');
  expect(output).toContain("Missing fact");
});

test.each([
  "[]",
  "[correctness, correctness]",
])("rejects ambiguous validators: %s", async (validate) => {
  await expect(compile(validate)).rejects.toThrow();
});
