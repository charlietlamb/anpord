import { profileOfRequest } from "@anpord/eval/domain/harness-profile";
import { EvalLocalLive } from "@anpord/eval/local-layer";
import { LocalTrials } from "@anpord/eval/services/local-trial";
import { Effect, ManagedRuntime } from "effect";
import { compileEvalEffect } from "../../../packages/sdk/src/evals/compiler";

/**
 * Runs an eval on this machine, against whatever this machine is serving.
 *
 * No database, no Trigger, no cloud sandbox: the trial runs here, so a case
 * can verify against a service on localhost that no hosted runner can see.
 *
 *   ANPORD_LOCAL_SANDBOX=1 bun run scripts/local-eval.ts ./my.eval.ts
 */
const file = process.argv[2];

if (file === undefined) {
  process.stderr.write("usage: local-eval.ts <file.eval.ts> [VAR...]\n");
  process.exit(1);
}

const forwardEnv = process.argv.slice(3);

const runtime = ManagedRuntime.make(EvalLocalLive);

const line = (text: string) => {
  process.stdout.write(`${text}\n`);
};

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

const program = Effect.gen(function* () {
  const request = yield* compileEvalEffect(file);
  const trials = yield* LocalTrials;
  const task = request.tasks[0];

  if (task === undefined) {
    return yield* Effect.dieMessage("the eval declares no tasks");
  }

  line(
    `${request.name ?? file} — ${request.cases.length} case(s) on this machine`
  );

  const results = yield* Effect.forEach(
    request.cases,
    (subject) =>
      trials.run({
        caseName: subject.name,
        forwardEnv,
        harness: task.harness,
        harnessVersion: "local",
        model: task.model,
        prepare: subject.prepare ?? null,
        profile: profileOfRequest(task.profile),
        prompt: request.prompt,
        source: { kind: "empty" },
        user: subject.user ?? null,
        validator: subject.validator ?? null,
        verifyCommand: subject.verify,
      }),
    { concurrency: 1 }
  );

  for (const result of results) {
    const passed = result.outcome.status === "passed";

    line(
      `${passed ? "pass" : result.outcome.status} ${result.caseName} ${seconds(result.durationMs)}`
    );
  }

  return results.every((result) => result.outcome.status === "passed");
});

const passed = await runtime
  .runPromise(program)
  .finally(() => runtime.dispose());

process.exit(passed ? 0 : 1);
