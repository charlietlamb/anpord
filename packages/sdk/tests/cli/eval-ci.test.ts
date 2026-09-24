import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { EvalBatch } from "@anpord/schema/domain/evals";
import { Schema } from "effect";
import { SuiteOutcome } from "../../src/cli/suite-outcome";
import { createBatch, createRun, createTrial } from "../fixtures/eval-run";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const binary = resolve(root, "packages/sdk/dist/bin.mjs");
const action = resolve(root, ".github/actions/eval/run.mjs");
const decodeReport = Schema.decodeUnknownSync(
  Schema.parseJson(Schema.Array(SuiteOutcome))
);
const definition = `import { command, empty, suite } from "anpord";
export default suite({id:"ci",name:"CI",source:empty,prompt:"test",cases:[{id:"fixture",name:"fixture",validate:command("true")}],variants:[{harness:"codex",model:"test",sandbox:"e2b"}],trials:1});`;

const execute = async (
  batch: EvalBatch,
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
  let conclusion = "";
  let starts = 0;
  const server = Bun.serve({
    port: 0,
    fetch: (request) => {
      const path = new URL(request.url).pathname;
      if (path === "/v1/runner.start") {
        starts++;
        return Response.json({ id: batch.id, runs: [] });
      }
      if (path === "/v1/evals.batches.get") {
        return Response.json(Schema.encodeSync(EvalBatch)(batch));
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
      const outputs = await readFile(output, "utf8");
      report =
        outputs
          .split("\n")
          .find((line) => line.startsWith("report="))
          ?.slice("report=".length) ?? report;
      conclusion =
        outputs
          .split("\n")
          .find((line) => line.startsWith("conclusion="))
          ?.slice("conclusion=".length) ?? "";
    }
    return {
      code,
      conclusion,
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
    const result = await execute(createBatch());
    expect(result.code).toBe(0);
    expect(result.stderr).toContain("https://anpord.test/evals/batch_fixture");
    expect(result.summary).toContain("Eval gate passed");
    expect(result.report[0].batch?.status).toBe("finished");
    expect(result.report[0].suite).toBe("CI");
  });

  test.each([
    "failed",
    "void",
  ] as const)("fails the gate with exit code 2 on a %s trial", async (status) => {
    const result = await execute(
      createBatch({ runs: [createRun({ trials: [createTrial({ status })] })] })
    );
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("fixture on codex/test");
    expect(result.summary).toContain("Eval gate failed");
    expect(result.report[0].problems).not.toBeEmpty();
  });

  test("keeps the batch ID on timeout and never resubmits", async () => {
    const result = await execute(
      createBatch({ status: "running", finishedAt: null }),
      { timeout: 1 }
    );
    expect(result.code).toBe(1);
    expect(result.starts).toBe(1);
    expect(result.report[0].batchId).toBe("batch_fixture");
    expect(result.report[0].error).toContain("not cancelled");
  });

  test("the action invokes the installed CLI with a quoted file path", async () => {
    const result = await execute(createBatch(), { action: true });
    expect(result.code).toBe(0);
    expect(result.starts).toBe(1);
    expect(result.report[0].batchId).toBe("batch_fixture");
    expect(result.conclusion).toBe("success");
  });

  test("the action preserves a failed batch", async () => {
    const result = await execute(
      createBatch({ status: "failed", failure: "Sandbox unavailable" }),
      { action: true }
    );
    expect(result.code).toBe(1);
    expect(result.report[0].error).toBe("Sandbox unavailable");
    expect(result.conclusion).toBe("failure");
  });

  test("missing action secrets fail before contacting the server", async () => {
    const result = await execute(createBatch(), { action: true, key: "" });
    expect(result.code).toBe(1);
    expect(result.starts).toBe(0);
    expect(result.stderr).toContain("api-key");
  });
});
