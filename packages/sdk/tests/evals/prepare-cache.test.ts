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

const compiled = async (body: string) => {
  workspace = await mkdtemp(join(tmpdir(), "anpord-prepare-"));

  await writeFile(
    join(workspace, "eval.ts"),
    `import { defineEval } from "anpord";
import type { Prepare } from "anpord";

export const install: Prepare = ${body};

export default defineEval({
  cases: [{ variables: { task: "x" }, name: "c", prepare: install, verify: "true" }],
  name: "prepare-cache",
  prompt: "{{task}}",
  tasks: [{ harness: "codex", model: "gpt-5", provider: "daytona" }],
  trials: 1,
});`
  );

  const payload = await compileEval(join(workspace, "eval.ts"));
  const script = join(workspace, "prepare.mjs");
  await writeFile(script, payload.cases[0]?.prepare?.source ?? "");

  return { script, workspace };
};

const runWith = async (script: string, cwd: string, restored = false) => {
  const process = Bun.spawn(["node", script], {
    cwd,
    env: { ...Bun.env, ANPORD_CACHE_RESTORED: restored ? "1" : "" },
  });

  return {
    exitCode: await process.exited,
    output: await new Response(process.stdout).text(),
  };
};

describe("what a prepare reports", () => {
  test("carries a plain return as its value", async () => {
    const { script, workspace: cwd } = await compiled(
      "() => ({ rendererPort: 4173 })"
    );

    const { output } = await runWith(script, cwd);

    expect(output).toContain('"value":{"rendererPort":4173}');
    expect(output).toContain('"cache":null');
  });

  /* Named, not written: the store belongs to the provider, and providers
     differ in what theirs can do. */
  test("names a directory worth keeping without touching a store", async () => {
    const { script, workspace: cwd } = await compiled(
      `() => ({
         cache: { key: "deps-abc", path: "node_modules" },
         value: { ready: true },
       })`
    );

    const { output } = await runWith(script, cwd);

    expect(output).toContain(
      '"cache":{"key":"deps-abc","path":"node_modules"}'
    );
    expect(output).toContain('"value":{"ready":true}');
  });

  test("is told when the runner restored one, so it can skip the work", async () => {
    const { script, workspace: cwd } = await compiled(
      "({ cached }) => ({ skipped: cached })"
    );

    const { output } = await runWith(script, cwd, true);

    expect(output).toContain('"value":{"skipped":true}');
  });

  test("is told when it was not restored", async () => {
    const { script, workspace: cwd } = await compiled(
      "({ cached }) => ({ skipped: cached })"
    );

    const { output } = await runWith(script, cwd);

    expect(output).toContain('"value":{"skipped":false}');
  });

  test("still reports when a prepare returns nothing", async () => {
    const { script, workspace: cwd } = await compiled("() => undefined");

    const { exitCode, output } = await runWith(script, cwd);

    expect(exitCode).toBe(0);
    expect(output).toContain('"cache":null');
  });
});
