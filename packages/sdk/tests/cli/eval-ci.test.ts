import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { EvalRun } from "@anpord/schema/domain/evals";
import { Schema } from "effect";
import { EvalOutcome } from "../../src/cli/eval-outcome";
import { createCell, createRun, createTrial } from "../fixtures/eval-run";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const binary = resolve(root, "packages/sdk/dist/bin.mjs");
const action = resolve(root, ".github/actions/eval/run.mjs");
const decodeReport = Schema.decodeUnknownSync(
  Schema.parseJson(Schema.Array(EvalOutcome))
);
const definition = `import { defineEval, empty } from "anpord";
export default defineEval({name:"CI",source:empty,prompt:"test",cases:[{name:"fixture",verify:"true"}],tasks:[{harness:"codex",model:"test",provider:"e2b"}],trials:1});`;

const execute = async (
  run: EvalRun,
  options: {
    readonly action?: boolean;
    readonly key?: string;
    readonly timeout?: number;
  } = {}
) => {
  const directory = await mkdtemp(resolve(tmpdir(), "anpord-ci-test-"));
  const file = resolve(directory, "suite with spaces.eval.ts");
  const output = resolve(directory, "outputs");
  const summary = resolve(directory, "summary.md");
  let report = resolve(directory, "report.json");
  let starts = 0;
  const server = Bun.serve({
    port: 0,
    fetch: (request) => {
      const path = new URL(request.url).pathname;
      if (path === "/v1/evals.start") {
        starts++;
        return Response.json({ id: run.id });
      }
      if (path === "/v1/evals.get") {
        return Response.json(Schema.encodeSync(EvalRun)(run));
      }
      return new Response("Unexpected request", { status: 400 });
    },
  });
  try {
    await writeFile(file, definition);
    const child = Bun.spawn(
      [
        "node",
        ...(options.action
          ? [action]
          : [
              binary,
              "eval",
              file,
              "--output",
              report,
              "--timeout",
              String(options.timeout ?? 10),
            ]),
      ],
      {
        cwd: resolve(root, "apps/e2e"),
        env: {
          PATH: process.env.PATH,
          TMPDIR: directory,
          ANPORD_API_KEY: options.key ?? "fixture",
          ANPORD_BASE_URL: server.url.href.slice(0, -1),
          ANPORD_WEB_URL: "https://anpord.test",
          ANPORD_EVAL_FILE: file,
          ANPORD_EVAL_TIMEOUT: String(options.timeout ?? 10),
          GITHUB_STEP_SUMMARY: summary,
          GITHUB_OUTPUT: output,
        },
        stdout: "pipe",
        stderr: "pipe",
      }
    );
    const [code, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ]);
    if (options.action && existsSync(output)) {
      report = (await readFile(output, "utf8")).trim().slice("report=".length);
    }
    return {
      code,
      stdout,
      stderr,
      starts,
      summary: existsSync(summary) ? await readFile(summary, "utf8") : "",
      report: existsSync(report)
        ? decodeReport(await readFile(report, "utf8"))
        : [],
    };
  } finally {
    server.stop(true);
    await rm(directory, { recursive: true, force: true });
  }
};

describe.if(existsSync(binary))("CI runner", () => {
  test("writes results and a link for a non-interactive single suite", async () => {
    const result = await execute(createRun());
    expect(result.code).toBe(0);
    expect(result.stderr).toContain("https://anpord.test/evals/run_fixture");
    expect(result.summary).toContain("Eval gate passed");
    expect(result.report[0].run?.status).toBe("finished");
  });

  test.each([
    "failed",
    "void",
  ] as const)("fails a %s trial without a baseline", async (status) => {
    const result = await execute(
      createRun({
        cells: [
          createCell({ trials: [createTrial({ status, passed: false })] }),
        ],
      })
    );
    expect(result.code).toBe(1);
    expect(result.summary).toContain("Eval gate failed");
    expect(result.report[0].problems).not.toBeEmpty();
  });

  test("keeps the run ID on timeout and never resubmits", async () => {
    const result = await execute(
      createRun({ status: "running", finishedAt: null }),
      { timeout: 1 }
    );
    expect(result.code).toBe(1);
    expect(result.starts).toBe(1);
    expect(result.report[0].runId).toBe("run_fixture");
    expect(result.report[0].problems.join()).toContain("not cancelled");
  });

  test("the action invokes the installed CLI with a quoted file path", async () => {
    const result = await execute(createRun(), { action: true });
    expect(result.code).toBe(0);
    expect(result.starts).toBe(1);
    expect(result.report[0].runId).toBe("run_fixture");
  });

  test("the action preserves a failed gate", async () => {
    const result = await execute(
      createRun({ status: "failed", failure: "Sandbox unavailable" }),
      { action: true }
    );
    expect(result.code).toBe(1);
    expect(result.report[0].problems).toContain("Sandbox unavailable");
  });

  test("missing action secrets fail before contacting the server", async () => {
    const result = await execute(createRun(), { action: true, key: "" });
    expect(result.code).toBe(1);
    expect(result.starts).toBe(0);
    expect(result.stderr).toContain("api-key");
  });
});
