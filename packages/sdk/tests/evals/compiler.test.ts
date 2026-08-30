import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compileEval } from "../../src/evals/compiler";

let workspace: string | undefined;

afterEach(async () => {
  if (workspace !== undefined) {
    await rm(workspace, { force: true, recursive: true });
  }
});

describe("compileEval", () => {
  test("bundles a directly referenced TypeScript validator", async () => {
    workspace = await mkdtemp(join(tmpdir(), "anpord-validator-"));
    await writeFile(
      join(workspace, "validator.ts"),
      `import type { Validator } from "anpord";
export const hasGreeting: Validator = async ({ readText }) => ({
  message: "result.txt contains hello",
  passed: (await readText("result.txt")).includes("hello"),
});`
    );
    await writeFile(
      join(workspace, "eval.ts"),
      `import { defineEval } from "anpord";
import { hasGreeting } from "./validator";
export default defineEval({
  cases: [{ goal: "Write a greeting", name: "greeting", validate: hasGreeting }],
  name: "direct-validator",
  prompt: "{{goal}}",
  tasks: [{ harness: "codex", model: "gpt-5", provider: "daytona" }],
  trials: 1,
});`
    );

    const payload = await compileEval(join(workspace, "eval.ts"));
    const validator = payload.cases[0]?.validator;

    expect(validator?.name).toBe("hasGreeting");
    expect(validator?.source).not.toContain("direct-validator");
    expect(payload.cases[0]?.verify).toBeNull();

    await writeFile(join(workspace, "result.txt"), "hello from the agent");
    const script = join(workspace, "validator.mjs");
    await writeFile(script, validator?.source ?? "");

    const process = Bun.spawn(["node", script], { cwd: workspace });
    const output = await new Response(process.stdout).text();

    expect(await process.exited).toBe(0);
    expect(output).toContain(
      'ANPORD_VALIDATOR_RESULT={"message":"result.txt contains hello","passed":true}'
    );
  });

  /* The authoring stub replaces the whole "anpord" module while bundling a
     definition. It once exported only defineEval, so importing repo failed at
     bundle time, and a later version stringified the helpers and silently lost
     the regexes they close over. Both compiled; neither worked. */
  test("resolves the source helpers a definition imports", async () => {
    workspace = await mkdtemp(join(tmpdir(), "anpord-source-"));
    await writeFile(
      join(workspace, "eval.ts"),
      `import { defineEval, empty, repo } from "anpord";
export default defineEval({
  cases: [
    { goal: "add a test", name: "inherits", verify: "true" },
    { goal: "from scratch", name: "overrides", source: empty, verify: "true" },
  ],
  name: "suite",
  prompt: "{{goal}}",
  source: repo("acme/widgets@a1b2c3d"),
  tasks: [{ harness: "codex", model: "gpt-5.6-sol", provider: "daytona" }],
  trials: 1,
});`
    );

    const payload = await compileEval(join(workspace, "eval.ts"));

    expect(payload.cases[0]?.source).toEqual({
      kind: "repo",
      ref: "a1b2c3d",
      url: "https://github.com/acme/widgets.git",
    });
    expect(payload.cases[1]?.source).toEqual({ kind: "empty" });
  });

  test("refuses a repository nobody could read, at the definition", async () => {
    workspace = await mkdtemp(join(tmpdir(), "anpord-bad-source-"));
    await writeFile(
      join(workspace, "eval.ts"),
      `import { defineEval, repo } from "anpord";
export default defineEval({
  cases: [{ goal: "g", name: "c", verify: "true" }],
  name: "suite",
  prompt: "{{goal}}",
  source: repo("acme"),
  tasks: [{ harness: "codex", model: "gpt-5.6-sol", provider: "daytona" }],
  trials: 1,
});`
    );

    expect(compileEval(join(workspace, "eval.ts"))).rejects.toThrow();
  });
});
