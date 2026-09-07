import { expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { compileEval } from "anpord/eval";
import { journals } from "./fixtures/evidence";
import { scenarios } from "./scenarios";
import { transports } from "./validators/catalog";

test("Claude setup starts with a single hosted smoke trial", async () => {
  const compiled = await compileEval(
    fileURLToPath(new URL("./claude-smoke.eval.ts", import.meta.url))
  );
  expect(compiled.cases).toHaveLength(1);
  expect(compiled.tasks).toEqual([
    { harness: "claude", model: "claude-haiku-4-5-20251001", sandbox: "e2b" },
  ]);
  expect(compiled.trials).toBe(1);
  expect(compiled.cases[0]?.verify).toBe('test "$(cat hello.txt)" = hello');
});

test.each([
  "claude",
  "codex",
] as const)("%s compiles every case and executes its bundled validator", async (agent) => {
  const compiled = await compileEval(
    fileURLToPath(new URL(`./${agent}.eval.ts`, import.meta.url))
  );
  expect(compiled.cases).toHaveLength(18);
  expect(compiled.tasks).toHaveLength(agent === "claude" ? 3 : 2);
  expect(compiled.trials).toBe(1);
  expect(new Set(compiled.cases.map(({ name }) => name)).size).toBe(18);
  for (const task of compiled.tasks) {
    expect(task.harness).toBe(agent);
    expect(
      task.profile?.files["workspace/.anpord/api/program.json"]
    ).toBeDefined();
    if (agent === "claude") {
      expect(task.profile?.files["workspace/.mcp.json"]).toBeDefined();
    }
  }
  for (const transport of transports) {
    for (const scenario of scenarios) {
      const subject = compiled.cases.find(
        ({ name }) => name === `${transport}/${scenario.name}`
      );
      if (!subject?.validator) {
        throw new Error("Missing compiled validator");
      }
      const validator =
        "checks" in subject.validator
          ? subject.validator.checks[0]
          : subject.validator;
      if (!validator) {
        throw new Error("Missing code check");
      }
      expect(subject.variables?.instruction).toBe(scenario.instruction);
      expect(
        subject.validator.sourceFiles?.some(({ path }) =>
          path.endsWith("validators/catalog.ts")
        )
      ).toBe(true);
      const workspace = await mkdtemp(
        join(tmpdir(), "anpord-model-validator-")
      );
      try {
        await mkdir(join(workspace, ".anpord/api"), { recursive: true });
        await writeFile(join(workspace, ".anpord/api/calls.jsonl"), "");
        const script = join(workspace, "validator.mjs");
        const answer = join(workspace, "answer.txt");
        await writeFile(script, validator.source);
        await writeFile(answer, JSON.stringify(scenario.expected));
        const path =
          transport === "api"
            ? ".anpord/api/calls.jsonl"
            : `.anpord/${transport}-calls.jsonl`;
        await writeFile(
          join(workspace, path),
          journals(scenario.requests)
            [transport].map((call) => JSON.stringify(call))
            .join("\n")
        );
        const child = Bun.spawn(["node", script], {
          cwd: workspace,
          env: { PATH: process.env.PATH, ANPORD_ANSWER_FILE: answer },
          stdout: "pipe",
          stderr: "pipe",
        });
        const [exitCode, output, error] = await Promise.all([
          child.exited,
          new Response(child.stdout).text(),
          new Response(child.stderr).text(),
        ]);
        expect(error).toBe("");
        expect(exitCode, output).toBe(0);
        expect(output).toContain('ANPORD_VALIDATOR_RESULT={"passed":true');
        expect(output).toContain("ANPORD_VALIDATION=");
      } finally {
        await rm(workspace, { recursive: true, force: true });
      }
    }
  }
}, 120_000);
