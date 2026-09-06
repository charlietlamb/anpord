import { expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { withApi } from "anpord/api";
import { compileEval } from "anpord/eval";
import { item } from "./fixtures/catalog";
import { catalogApi } from "./mocks/catalog-api";

const sdk = new URL("../../../../packages/sdk/dist/index.mjs", import.meta.url);

test.each([
  "mcp",
  "cli",
  "sdk",
  "api",
] as const)("%s validator accepts real evidence and rejects an unsupported answer", async (suite) => {
  const compiled = await compileEval(
    fileURLToPath(new URL(`./${suite}.eval.ts`, import.meta.url))
  );
  const validation = compiled.cases[0].validator;
  if (!validation) {
    throw new Error("Expected a code validator");
  }
  const validator = "checks" in validation ? validation.checks[0] : validation;
  if (!validator) {
    throw new Error("Expected a code check");
  }
  expect(validation.sourceFiles?.length).toBeGreaterThan(0);
  expect(validator.manifest).toHaveLength(1);
  if ("judges" in validation) {
    expect(validation.judges[0]?.name).toBe("correct-item");
  }
  for (const scenario of [
    "passed",
    "missing-evidence",
    "wrong-answer",
  ] as const) {
    const passed = scenario === "passed";
    const workspace = await mkdtemp(join(tmpdir(), "anpord-ci-validator-"));
    try {
      await mkdir(join(workspace, ".anpord"));
      await mkdir(join(workspace, "apps/e2e"), { recursive: true });
      const script = join(workspace, "validator.mjs");
      const answer = join(workspace, "answer.txt");
      await writeFile(script, validator.source);
      await writeFile(
        answer,
        scenario === "wrong-answer" ? "Wrong item" : item.name
      );
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
      } else if (suite === "api") {
        const calls = await withApi({
          api: catalogApi,
          run: async ({ url, calls }) => {
            await fetch(`${url}/items/missing`);
            await fetch(`${url}/items/${item.id}`);
            return calls();
          },
        });
        await mkdir(join(workspace, ".anpord/api"));
        await writeFile(
          join(workspace, ".anpord/api/calls.jsonl"),
          scenario === "missing-evidence"
            ? ""
            : calls.map((call) => JSON.stringify(call)).join("\n")
        );
      } else {
        const call =
          suite === "mcp"
            ? { server: "catalog", kind: "tool", name: "items_get" }
            : { cli: "catalog", command: "items get" };
        const calls =
          scenario === "missing-evidence"
            ? []
            : [
                { ...call, input: { id: "missing" }, error: "Unknown item" },
                { ...call, input: { id: item.id } },
              ];
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
      expect(output).toContain("ANPORD_VALIDATION=");
      if (suite !== "sdk") {
        expect(output).toContain(
          suite === "api" ? "Catalog HTTP requests" : "Catalog requests"
        );
      }
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  }
}, 30_000);
