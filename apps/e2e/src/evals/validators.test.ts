import { expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { compileEval } from "anpord/eval";
import { item } from "./fixtures/catalog";

const sdk = new URL("../../../../packages/sdk/dist/index.mjs", import.meta.url);

test.each([
  "mcp",
  "cli",
  "sdk",
] as const)("%s validator accepts real evidence and rejects an unsupported answer", async (suite) => {
  const compiled = await compileEval(
    fileURLToPath(new URL(`./${suite}.eval.ts`, import.meta.url))
  );
  const validator = compiled.cases[0].validator;
  if (!validator || "kind" in validator) {
    throw new Error("Expected a code validator");
  }
  for (const passed of [true, false]) {
    const workspace = await mkdtemp(join(tmpdir(), "anpord-ci-validator-"));
    try {
      await mkdir(join(workspace, ".anpord"));
      await mkdir(join(workspace, "apps/e2e"), { recursive: true });
      const script = join(workspace, "validator.mjs");
      const answer = join(workspace, "answer.txt");
      await writeFile(script, validator.source);
      await writeFile(answer, item.name);
      if (suite === "sdk") {
        await writeFile(
          join(workspace, "apps/e2e/sdk-smoke.mjs"),
          passed
            ? `import { Anpord } from ${JSON.stringify(sdk.href)};
export async function resolvePrompt(baseUrl, id, name) {
  const client = new Anpord({ apiKey: "ci-fixture", baseUrl, cache: false });
  try { return (await client.prompts.get({ id, variables: { name } })).content; }
  finally { await client.dispose(); }
}`
            : 'export async function resolvePrompt() { return "Hello CI"; }'
        );
      } else {
        const call =
          suite === "mcp"
            ? { server: "catalog", kind: "tool", name: "items_get" }
            : { cli: "catalog", command: "items get" };
        const calls = passed
          ? [
              { ...call, input: { id: "missing" }, error: "Unknown item" },
              { ...call, input: { id: item.id } },
            ]
          : [];
        await writeFile(
          join(workspace, `.anpord/${suite}-calls.jsonl`),
          calls.map((entry) => JSON.stringify(entry)).join("\n")
        );
      }
      const child = Bun.spawn(["node", script], {
        cwd: workspace,
        env: { PATH: process.env.PATH, ANPORD_ANSWER_FILE: answer },
        stdout: "pipe",
        stderr: "pipe",
      });
      const [code, output, error] = await Promise.all([
        child.exited,
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
      ]);
      expect(error).toBe("");
      expect(code).toBe(0);
      expect(output).toContain(`ANPORD_VALIDATOR_RESULT={"passed":${passed}`);
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  }
});
