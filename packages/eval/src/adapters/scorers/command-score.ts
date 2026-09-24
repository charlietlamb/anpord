import {
  type EvalValidation,
  validationCapture,
  validationExecution,
  validationSnapshot,
} from "@anpord/schema/domain/eval-validations";
import { Clock, Effect } from "effect";
import { outcomeOf } from "../../domain/trial";
import {
  stepResultsOf,
  verifyScriptOf,
  withoutMarks,
} from "../../domain/verify-script";
import type { ScorerShape } from "../../ports/scorer";
import { isUnguardedPipeline } from "./shell-pipeline";
import { executeValidation, publishValidation } from "./validation";
import { answerEnv, resultStatus } from "./validator-protocol";

export const scoreCommand: ScorerShape["score"] = (request) =>
  Effect.gen(function* () {
    if (request.verifyCommand === null) {
      return outcomeOf({
        commandCount: request.commandCount,
        exitCode: -1,
        fingerprint: { verify: "" },
        modelMs: request.modelMs,
        sandboxMs: 0,
      });
    }

    if (isUnguardedPipeline(request.verifyCommand)) {
      const validation: EvalValidation = {
        ...validationExecution(
          {
            id: "command:0",
            index: 0,
            name: "Verify command",
            kind: "command",
          },
          null
        ),
        status: "failed",
        message: "Verifier refused: pipelines must use pipefail or PIPESTATUS",
        input: validationCapture()({ command: request.verifyCommand }),
      };
      yield* publishValidation(validation, request.onValidation);
      return {
        ...outcomeOf({
          commandCount: request.commandCount,
          exitCode: 1,
          fingerprint: { verify: "refused: the verifier is a pipeline" },
          modelMs: request.modelMs,
          sandboxMs: 0,
        }),
        validations: [validation],
      };
    }

    const script = verifyScriptOf(request.verifyCommand);
    const started = yield* Clock.currentTimeMillis;
    const capture = validationCapture();
    const record = {
      ...validationExecution(
        {
          id: "command:0",
          index: 0,
          kind: "command",
          name: "Verify command",
        },
        started
      ),
      input: capture({
        command: request.verifyCommand,
        executed: script.command,
      }),
    };
    const execution = yield* executeValidation({
      sandbox: request.sandbox,
      command: script.command,
      options: {
        cwd: request.workspace,
        env: { ...request.env, ...answerEnv(request.sandbox) },
        timeoutMs: 300_000,
      },
      records: [record],
      observe: request.onValidation,
    });
    const raw = execution.stdout + execution.stderr;
    const output = withoutMarks(raw);
    const interrupted = execution.exitCode === null || execution.interrupted;
    const exitCode = interrupted ? -1 : (execution.exitCode ?? -1);

    const outcome = outcomeOf({
      commandCount: request.commandCount,
      exitCode,
      fingerprint: {
        verify:
          output.trim() === "" && execution.exitCode !== null
            ? `exited ${exitCode}`
            : output,
      },
      modelMs: request.modelMs,
      sandboxMs: 0,
      verifySteps: stepResultsOf(script, raw),
    });
    const validation = validationSnapshot({
      ...record,
      status:
        interrupted || outcome.status === "void"
          ? "error"
          : resultStatus(outcome.status === "passed"),
      durationMs: Math.max(0, (yield* Clock.currentTimeMillis) - started),
      exitCode: execution.exitCode,
      message: interrupted ? "Verifier did not report process exit" : "",
      output: capture({
        stdout: execution.stdout,
        stderr: execution.stderr,
        exitCode: execution.exitCode,
      }),
      truncated: execution.rawTruncated,
    });
    yield* publishValidation(validation, request.onValidation);
    return {
      ...outcome,
      validations: [validation],
      ...(interrupted
        ? { status: "void" as const, voidFields: ["verify"] }
        : {}),
    };
  });
