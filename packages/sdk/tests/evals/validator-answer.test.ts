import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validatorEntry } from "../../src/evals/runner-source";

let workspace: string | undefined;

afterEach(async () => {
  if (workspace !== undefined) {
    await rm(workspace, { force: true, recursive: true });
    workspace = undefined;
  }
});

const directory = async () => {
  workspace ??= await mkdtemp(join(tmpdir(), "anpord-answer-"));

  return workspace;
};

/** Runs the published runtime the way the scorer does: the validator module
 * beside it, the file paths handed over on the environment. */
const runValidator = async (
  body: string,
  env: Readonly<Record<string, string>>
) => {
  const workspace = await directory();
  const module = join(workspace, "validator.mjs");
  await writeFile(module, `export const check = ${body};`);

  const script = join(workspace, "runner.mjs");
  await writeFile(script, validatorEntry(module, "check"));

  const process = Bun.spawn(["node", script], {
    cwd: workspace,
    env: { ...Bun.env, ...env },
  });

  return {
    exitCode: await process.exited,
    output: await new Response(process.stdout).text(),
  };
};

const wrote = async (name: string, content: string) => {
  const path = join(await directory(), name);
  await writeFile(path, content);

  return path;
};

describe("a validator reading what the agent said", () => {
  test("is handed the answer from the file the scorer named", async () => {
    const path = await wrote("answer.txt", "There are eight planets.");
    const result = await runValidator(
      "async (context) => ({ passed: (await context.answer()).includes('eight') })",
      { ANPORD_ANSWER_FILE: path }
    );

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('ANPORD_VALIDATOR_RESULT={"passed":true}');
  });

  test("is handed the transcript separately from the answer", async () => {
    const answer = await wrote("answer.txt", "There are eight.");
    const transcript = await wrote(
      "transcript.txt",
      "Checking.\n\nThere are eight."
    );

    const result = await runValidator(
      "async (context) => ({ passed: (await context.transcript()).startsWith('Checking.') && (await context.answer()) === 'There are eight.' })",
      {
        ANPORD_ANSWER_FILE: answer,
        ANPORD_TRANSCRIPT_FILE: transcript,
      }
    );

    expect(result.output).toContain('ANPORD_VALIDATOR_RESULT={"passed":true}');
  });

  /* A validator written against a harness that has not been taught to write
     these yet must read a quiet answer, not crash. A throw here would report
     an SDK version skew as a failed trial. */
  test("reads an empty answer when nothing named the files", async () => {
    const result = await runValidator(
      "async (context) => ({ passed: (await context.answer()) === '' && (await context.transcript()) === '' })",
      {}
    );

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('ANPORD_VALIDATOR_RESULT={"passed":true}');
  });

  test("reads an empty answer when the file is gone", async () => {
    const result = await runValidator(
      "async (context) => ({ passed: (await context.answer()) === '' })",
      { ANPORD_ANSWER_FILE: "/nowhere/answer.txt" }
    );

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('ANPORD_VALIDATOR_RESULT={"passed":true}');
  });

  test("keeps the prepare value alongside them", async () => {
    const path = await wrote("answer.txt", "done");
    const result = await runValidator(
      "async (context) => ({ passed: context.prepared.tag === 'sha-abc' && (await context.answer()) === 'done' })",
      {
        ANPORD_ANSWER_FILE: path,
        ANPORD_PREPARE_VALUE: JSON.stringify({ tag: "sha-abc" }),
      }
    );

    expect(result.output).toContain('ANPORD_VALIDATOR_RESULT={"passed":true}');
  });
});
