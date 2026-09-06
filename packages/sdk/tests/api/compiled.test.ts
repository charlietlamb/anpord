import { afterEach, expect, test } from "bun:test";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  API_JOURNAL,
  API_READY,
  ApiCall,
  ApiManifest,
} from "@anpord/schema/domain/api-mocks";
import {
  EvalValidation,
  VALIDATION_FRAME,
} from "@anpord/schema/domain/eval-validations";
import { Schema } from "effect";
import { compileFixture } from "../fixtures/compile-eval";

let workspace: string | undefined;
let server: ReturnType<typeof Bun.spawn> | undefined;
afterEach(async () => {
  server?.kill();
  await server?.exited;
  if (workspace) {
    await rm(workspace, { recursive: true, force: true });
  }
});

test("compiled HTTP server and validator preserve request evidence in Node", async () => {
  workspace = await mkdtemp(join(tmpdir(), "anpord-http-compiled-"));
  await mkdir(join(workspace, "node_modules"));
  await symlink(
    join(import.meta.dir, "../../node_modules/zod"),
    join(workspace, "node_modules/zod")
  );
  const entry = join(workspace, "eval.ts");
  await writeFile(
    entry,
    `import { defineEval, empty } from "anpord";
import { api, endpoint } from "anpord/api";
import { z } from "zod";
export default defineEval({ name: "http", source: empty, prompt: "Use catalog", trials: 1,
  api: [api({ name: "catalog", endpoints: [endpoint({ method: "GET", path: "/items/:id",
    inputSchema: z.object({ params: z.object({ id: z.string() }) }),
    responses: { 200: z.object({ id: z.string() }) },
    handler: ({ params }, { log }) => { log({ id: params.id }); return { status: 200, body: params }; }
  })] })],
  tasks: [{ harness: "codex", model: "model", sandbox: "e2b" }],
  cases: [{ name: "read", validate: async function validateHttp({ api }) {
    const url = await api.url("catalog");
    await fetch(url + "/items/validator");
    const calls = await api.calls("catalog");
    console.info("HTTP statuses", calls.map(({ status }) => status));
    return { passed: calls.length === 2 && calls.every(({ status }) => status === 200) };
  } }]
});`
  );
  const compiled = await compileFixture(entry);
  for (const [path, source] of Object.entries(
    compiled.tasks[0]?.profile?.files ?? {}
  )) {
    if (!path.startsWith("workspace/")) {
      continue;
    }
    const target = join(workspace, path.slice("workspace/".length));
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, source);
  }
  server = Bun.spawn(["node", ".anpord/api/server.mjs"], {
    cwd: workspace,
    stdout: "pipe",
    stderr: "pipe",
  });
  let ready = "";
  for await (const chunk of server.stdout) {
    ready += new TextDecoder().decode(chunk);
    if (ready.includes("\n")) {
      break;
    }
  }
  if (!ready) {
    throw new Error((await new Response(server.stderr).text()).slice(-4000));
  }
  expect(ready).toStartWith(API_READY);
  const manifest = Schema.decodeUnknownSync(Schema.parseJson(ApiManifest))(
    ready.trim().slice(API_READY.length)
  );
  const url = manifest[0]?.url;
  if (!url) {
    throw new Error("Missing API URL");
  }
  expect(await (await fetch(`${url}/items/agent`)).json()).toEqual({
    id: "agent",
  });
  const validator = compiled.cases[0]?.validator;
  if (!(validator && "source" in validator)) {
    throw new Error("Missing validator");
  }
  await writeFile(join(workspace, "validator.mjs"), validator.source);
  const child = Bun.spawn(["node", "validator.mjs"], { cwd: workspace });
  const output = await new Response(child.stdout).text();
  expect(await child.exited).toBe(0);
  const records = output
    .split("\n")
    .filter((line) => line.startsWith(VALIDATION_FRAME))
    .map((line) =>
      Schema.decodeUnknownSync(Schema.parseJson(EvalValidation))(
        line.slice(VALIDATION_FRAME.length)
      )
    );
  expect(records.at(-1)?.status).toBe("passed");
  expect(records.at(-1)?.calls.map(({ method }) => method)).toEqual([
    "api.url",
    "api.calls",
  ]);
  const calls = (await readFile(join(workspace, API_JOURNAL), "utf8"))
    .trim()
    .split("\n")
    .map((line) => Schema.decodeUnknownSync(Schema.parseJson(ApiCall))(line));
  expect(calls.map(({ path }) => path)).toEqual([
    "/items/agent",
    "/items/validator",
  ]);
  expect(calls[0]?.logs[0]?.text).toContain("agent");
  server.kill();
  await server.exited;
  await expect(fetch(url)).rejects.toThrow();
}, 30_000);
