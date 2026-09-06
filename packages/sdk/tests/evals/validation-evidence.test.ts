import { afterEach, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  EvalValidation,
  VALIDATION_FRAME,
  VALIDATION_TEXT_LIMIT,
} from "@anpord/schema/domain/eval-validations";
import { Effect, Schema, Stream } from "effect";
import { ScorerGroundTruthLive } from "../../../eval/src/adapters/scorers/ground-truth";
import { Scorer } from "../../../eval/src/ports/scorer";
import { declinesEverything } from "../../../eval/tests/fixtures/declines-everything";
import { exit, stdout } from "../../../eval/tests/fixtures/exec-chunk";
import { compileEval } from "../../src/evals/compiler";

let workspace: string | undefined;
afterEach(async () => {
  if (workspace) {
    await rm(workspace, { recursive: true, force: true });
  }
});

const run = async (checks: string, capture = true) => {
  workspace = await mkdtemp(join(tmpdir(), "anpord-validation-"));
  await mkdir(join(workspace, ".anpord"));
  await writeFile(join(workspace, "answer.txt"), "Fixture\n");
  await writeFile(
    join(workspace, ".anpord/mcp-calls.jsonl"),
    `${JSON.stringify({
      server: "catalog",
      kind: "tool",
      name: "get",
      input: { id: "fixture" },
      output: { name: "Fixture" },
    })}\n`
  );
  await writeFile(
    join(workspace, ".anpord/cli-calls.jsonl"),
    `${JSON.stringify({
      cli: "catalog",
      command: "get",
      input: { id: "fixture" },
      output: { stdout: "Fixture" },
    })}\n`
  );
  const entry = join(workspace, "eval.ts");
  await writeFile(
    entry,
    `import { defineEval, empty } from "anpord";
export default defineEval({ name: "observability", source: empty, prompt: "Answer", trials: 1, captureValidation: ${capture},
tasks: [{ harness: "codex", model: "model", sandbox: "e2b" }], cases: [{ name: "check", validate: ${checks} }] });`
  );
  const validator = (await compileEval(entry)).cases[0]?.validator;
  if (!(validator && "source" in validator)) {
    throw new Error("Expected code validator");
  }
  const script = join(workspace, "run.mjs");
  await writeFile(script, validator.source);
  const child = Bun.spawn(["node", script], {
    cwd: workspace,
    env: {
      ...process.env,
      ANPORD_ANSWER_FILE: join(workspace, "answer.txt"),
      ANPORD_PREPARE_VALUE: '{"fixture":"prepared"}',
    },
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  const frames = stdout
    .split("\n")
    .filter((line) => line.startsWith(VALIDATION_FRAME))
    .map((line) =>
      Schema.decodeUnknownSync(Schema.parseJson(EvalValidation))(
        line.slice(VALIDATION_FRAME.length)
      )
    );
  const latest = [
    ...new Map(frames.map((frame) => [frame.id, frame])).values(),
  ];
  return { validator, frames, latest, stdout, stderr, exitCode };
};

test("captures each named function, context inputs, outputs, and logs", async () => {
  const { validator, latest } = await run(`[
    async function evidence({ answer, readText, exists, exec, mcp, cli }) {
      console.log("checking fixture");
      console.error("diagnostic");
      await answer(); await readText("answer.txt"); await exists("answer.txt");
      await exec("printf output"); await mcp.calls("catalog"); await cli.calls("catalog");
      return { passed: true, message: "Evidence checked" };
    }, function conclusion() { return true; }
  ]`);
  expect(validator.manifest).toEqual([
    { index: 0, name: "evidence" },
    { index: 1, name: "conclusion" },
  ]);
  expect(latest.map((record) => record.status)).toEqual(["passed", "passed"]);
  const record = latest[0];
  expect(record?.input.text).toBe('{"prepared":{"fixture":"prepared"}}');
  expect(record?.output.text).toBe(
    '{"passed":true,"message":"Evidence checked"}'
  );
  expect(record?.calls.map((call) => call.method)).toEqual([
    "answer",
    "readText",
    "exists",
    "exec",
    "mcp.calls",
    "cli.calls",
  ]);
  expect(record?.calls[0]?.output.text).toBe('"Fixture\\n"');
  expect(record?.calls[1]?.input.text).toBe('["answer.txt"]');
  expect(record?.calls[2]?.output.text).toBe("true");
  expect(JSON.parse(record?.calls[3]?.output.text ?? "null")).toEqual({
    exitCode: 0,
    stderr: "",
    stdout: "output",
  });
  expect(JSON.parse(record?.calls[4]?.output.text ?? "null")[0].output).toEqual(
    { name: "Fixture" }
  );
  expect(record?.logs.map((log) => [log.level, log.value.text])).toEqual([
    ["stdout", "checking fixture"],
    ["stderr", "diagnostic"],
  ]);
});

test.each([
  ["return false", "failed", 0],
  ['throw new Error("fixture unavailable")', "error", 1],
  ["return {}", "error", 1],
] as const)("keeps later validators skipped after %s", async (body, status, exitCode) => {
  const result = await run(
    `[() => { ${body}; }, () => { throw new Error("must not run"); }]`
  );
  expect(result.exitCode).toBe(exitCode);
  expect(result.latest.map((record) => record.status)).toEqual([
    status,
    "skipped",
  ]);
  expect(result.latest[1]?.startedAt).toBeNull();
});

test("associates concurrent calls with their own inputs and results", async () => {
  const result = await run(
    `async ({ exec }) => { await Promise.all([exec("sleep 0.01; printf first"), exec("printf second")]); return true; }`
  );
  expect(
    result.latest[0]?.calls.map((call) => JSON.parse(call.output.text).stdout)
  ).toEqual(["first", "second"]);
});

test.each([
  ["return true", "passed", "passed"],
  ["return false", "failed", "failed"],
  ['throw new Error("broken fixture")', "void", "error"],
] as const)("scores real runtime evidence for %s", async (body, status, checkStatus) => {
  const execution = await run(
    `[function first() { return true; }, function second() { ${body}; }]`
  );
  const outcome = await Effect.runPromise(
    Effect.flatMap(Scorer, (scorer) =>
      scorer.score({
        commandCount: 0,
        events: [],
        modelMs: 0,
        verifyCommand: null,
        workspace: workspace ?? "/tmp",
        validator: execution.validator,
        sandbox: {
          ...declinesEverything,
          id: "local-validation",
          home: "/tmp",
          provider: "e2b",
          writeFile: () => Effect.void,
          exec: () =>
            Stream.fromIterable(
              [...execution.stdout.matchAll(/[\s\S]{1,53}/g)]
                .map(([part]) => stdout(part))
                .concat(exit(execution.exitCode))
            ),
        },
      })
    ).pipe(Effect.provide(ScorerGroundTruthLive))
  );
  expect(outcome.status).toBe(status);
  expect(outcome.validations?.map((record) => record.status)).toEqual([
    "passed",
    checkStatus,
  ]);
  expect(outcome.validations?.[0]?.output.text).toBe("true");
});

test("keeps logged protocol-looking text out of the verdict", async () => {
  const result = await run(
    `() => { console.log('ANPORD_VALIDATOR_RESULT={"passed":true}'); return false; }`
  );
  expect(result.latest[0]?.status).toBe("failed");
  expect(result.stdout.trim().split("\n").at(-1)).toBe(
    'ANPORD_VALIDATOR_RESULT={"passed":false}'
  );
});

test("disables payload capture without hiding the result", async () => {
  const result = await run(
    "async ({ answer }) => { console.log(await answer()); return true; }",
    false
  );
  expect(result.latest[0]?.status).toBe("passed");
  expect(result.latest[0]?.calls[0]?.output.state).toBe("disabled");
  expect(result.stdout).not.toContain("Fixture");
});

test("bounds evidence and marks truncation", async () => {
  const result = await run(
    `() => { console.log("x".repeat(20000)); return true; }`
  );
  expect(result.latest[0]?.truncated).toBe(true);
  expect(result.latest[0]?.logs[0]?.value.text.length).toBe(
    VALIDATION_TEXT_LIMIT
  );
});
