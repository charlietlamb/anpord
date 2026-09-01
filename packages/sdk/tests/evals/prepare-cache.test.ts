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

const compiled = async (caseBody: string) => {
  workspace = await mkdtemp(join(tmpdir(), "anpord-prepare-"));

  await writeFile(
    join(workspace, "eval.ts"),
    `import { defineEval } from "anpord";
import type { Prepare } from "anpord";

export const install: Prepare = ({ cached }) => ({ skipped: cached });

export default defineEval({
  cases: [${caseBody}],
  name: "prepare-cache",
  prompt: "{{task}}",
  tasks: [{ harness: "codex", model: "gpt-5", provider: "daytona" }],
  trials: 1,
});`
  );

  return await compileEval(join(workspace, "eval.ts"));
};

const runScript = async (script: string, cwd: string, restored: boolean) => {
  const process = Bun.spawn(["node", script], {
    cwd,
    env: { ...Bun.env, ANPORD_CACHE_RESTORED: restored ? "1" : "" },
  });

  return await new Response(process.stdout).text();
};

describe("what a case says it keeps", () => {
  /* Declared on the case, because a restore happens before the prepare runs
     and so cannot be told where to look by it. */
  test("reaches the payload the runner is given", async () => {
    const payload = await compiled(
      `{ cache: { key: "deps-v1", path: "node_modules" }, name: "c", prepare: install, variables: { task: "x" }, verify: "true" }`
    );

    expect(payload.cases[0]?.cache).toEqual({
      key: "deps-v1",
      path: "node_modules",
    });
  });

  test("is absent when the case keeps nothing", async () => {
    const payload = await compiled(
      `{ name: "c", prepare: install, variables: { task: "x" }, verify: "true" }`
    );

    expect(payload.cases[0]?.cache).toBeUndefined();
  });
});

describe("what a prepare is told", () => {
  test("knows the runner restored what the case keeps", async () => {
    const payload = await compiled(
      `{ cache: { key: "deps-v1", path: "node_modules" }, name: "c", prepare: install, variables: { task: "x" }, verify: "true" }`
    );
    const script = join(workspace as string, "prepare.mjs");
    await writeFile(script, payload.cases[0]?.prepare?.source ?? "");

    expect(await runScript(script, workspace as string, true)).toContain(
      '{"skipped":true}'
    );
  });

  test("knows when it did not", async () => {
    const payload = await compiled(
      `{ cache: { key: "deps-v1", path: "node_modules" }, name: "c", prepare: install, variables: { task: "x" }, verify: "true" }`
    );
    const script = join(workspace as string, "prepare.mjs");
    await writeFile(script, payload.cases[0]?.prepare?.source ?? "");

    expect(await runScript(script, workspace as string, false)).toContain(
      '{"skipped":false}'
    );
  });
});
