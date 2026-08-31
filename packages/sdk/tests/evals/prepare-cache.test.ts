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

const reportingCache = async () => {
  workspace = await mkdtemp(join(tmpdir(), "anpord-prepare-"));

  await writeFile(
    join(workspace, "eval.ts"),
    `import { defineEval } from "anpord";
import type { Prepare } from "anpord";

export const install: Prepare = ({ cache }) => ({ saw: cache });

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

const runWith = async (
  script: string,
  cwd: string,
  env: Record<string, string>
) => {
  const process = Bun.spawn(["node", script], {
    cwd,
    env: { ...Bun.env, ...env },
  });
  const output = await new Response(process.stdout).text();

  return { exitCode: await process.exited, output };
};

describe("the cache a prepare is handed", () => {
  test("is the directory the sandbox mounted", async () => {
    const { script, workspace: cwd } = await reportingCache();

    const { exitCode, output } = await runWith(script, cwd, {
      ANPORD_CACHE_DIR: "/anpord-cache",
    });

    expect(exitCode).toBe(0);
    expect(output).toContain('ANPORD_PREPARE_RESULT={"saw":"/anpord-cache"}');
  });

  /* Null rather than undefined, so a prepare can branch on it. A provider with
     nowhere to keep a volume mounts none, and reading `cache` there used to
     yield undefined while the type promised `string | null`. */
  test("is null when the provider mounted none", async () => {
    const { script, workspace: cwd } = await reportingCache();

    const { exitCode, output } = await runWith(script, cwd, {
      ANPORD_CACHE_DIR: "",
    });

    expect(exitCode).toBe(0);
    expect(output).toContain('ANPORD_PREPARE_RESULT={"saw":null}');
  });
});
