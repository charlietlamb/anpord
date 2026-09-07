import { afterEach, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EvalValidator } from "@anpord/schema/domain/evals";
import { Schema } from "effect";
import { compileEval } from "../../src/evals/compiler";

let workspace: string;
afterEach(async () => {
  if (workspace) {
    await rm(workspace, { recursive: true, force: true });
  }
});

const create = async (captureSource = true) => {
  workspace = await mkdtemp(join(tmpdir(), "anpord-source-"));
  await mkdir(join(workspace, "evals"));
  await writeFile(join(workspace, "package.json"), '{"type":"module"}');
  await writeFile(join(workspace, ".env"), "NOT_SOURCE=private");
  await writeFile(
    join(workspace, "unrelated.ts"),
    'export const ignored = "private";'
  );
  await writeFile(
    join(workspace, "check.ts"),
    'import type { Validator } from "anpord";\r\n\r\n// Exact formatting ✓\r\nexport const check: Validator = () => true;\r\n'
  );
  const entry = join(workspace, "evals/example.eval.ts");
  await writeFile(
    entry,
    `import { suite, empty } from "anpord";
import { check } from "../check";
export default suite({
  name: "example", captureSource: ${captureSource}, source: empty,
  prompt: "Answer", trials: 1,
  tasks: [{ harness: "codex", model: "model", provider: "e2b" }],
  cases: [{ name: "answer", validate: check }],
});
`
  );
  return entry;
};

test("captures exact project files from the validator build", async () => {
  const entry = await create();
  const compiled = await compileEval(entry);
  const validator = Schema.decodeUnknownSync(EvalValidator)(
    compiled.cases[0]?.validator
  );
  expect(validator.sourceFiles).toEqual([
    { path: "evals/example.eval.ts", content: await readFile(entry, "utf8") },
    {
      path: "check.ts",
      content: await readFile(join(workspace, "check.ts"), "utf8"),
    },
  ]);
  await writeFile(join(workspace, "check.ts"), "changed after compilation");
  expect(validator.sourceFiles?.[1]?.content).toContain(
    "// Exact formatting ✓\r\n"
  );
});

test("can omit source while keeping the executable validator", async () => {
  const validator = (await compileEval(await create(false))).cases[0]
    ?.validator;
  expect(validator?.sourceFiles).toBeUndefined();
  expect(
    validator && "source" in validator && validator.source.length > 0
  ).toBe(true);
});

test("does not capture imports outside the package boundary", async () => {
  const entry = await create();
  await writeFile(join(workspace, "evals/package.json"), '{"type":"module"}');
  const validator = (await compileEval(entry)).cases[0]?.validator;
  expect(validator?.sourceFiles).toEqual([
    { path: "example.eval.ts", content: await readFile(entry, "utf8") },
  ]);
});
