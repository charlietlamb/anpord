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

const runWith = async (script: string, cwd: string, cacheDir: string) => {
  const process = Bun.spawn(["node", script], {
    cwd,
    env: { ...Bun.env, ANPORD_CACHE_DIR: cacheDir },
  });
  const output = await new Response(process.stdout).text();

  return { exitCode: await process.exited, output };
};

describe("the cache a prepare is handed", () => {
  test("is absent when the provider mounted none", async () => {
    const { script, workspace: cwd } = await compiled(
      "({ cache }) => ({ absent: cache === null })"
    );

    const { output } = await runWith(script, cwd, "");

    expect(output).toContain('{"absent":true}');
  });

  test("reports nothing stored before anything is saved", async () => {
    const { script, workspace: cwd } = await compiled(
      "async ({ cache }) => ({ had: await cache.has('deps') })"
    );
    const store = await mkdtemp(join(tmpdir(), "anpord-store-"));

    const { output } = await runWith(script, cwd, store);
    await rm(store, { force: true, recursive: true });

    expect(output).toContain('{"had":false}');
  });

  /* The behaviour the whole thing exists for, and the one that a directory
     shared through object storage could never provide: what one run built,
     the next run gets back. */
  test("gives back what an earlier run saved", async () => {
    const store = await mkdtemp(join(tmpdir(), "anpord-store-"));

    const first = await compiled(
      `async ({ cache, exec }) => {
         await exec("sh", ["-c", "mkdir -p built && echo compiled > built/out.txt"]);
         await cache.save("deps", "built");
         return { saved: true };
       }`
    );
    await runWith(first.script, first.workspace, store);

    const second = await compiled(
      `async ({ cache, exec, readText }) => {
         const restored = await cache.restore("deps", "built");
         const { stdout } = await exec("cat", ["built/out.txt"]);
         return { restored, contents: stdout.trim() };
       }`
    );
    const { output } = await runWith(second.script, second.workspace, store);

    await rm(store, { force: true, recursive: true });

    expect(output).toContain('"restored":true');
    expect(output).toContain('"contents":"compiled"');
  });

  test("says so rather than throwing when nothing was stored", async () => {
    const { script, workspace: cwd } = await compiled(
      "async ({ cache }) => ({ restored: await cache.restore('absent', 'target') })"
    );
    const store = await mkdtemp(join(tmpdir(), "anpord-store-"));

    const { exitCode, output } = await runWith(script, cwd, store);
    await rm(store, { force: true, recursive: true });

    expect(exitCode).toBe(0);
    expect(output).toContain('{"restored":false}');
  });
});
