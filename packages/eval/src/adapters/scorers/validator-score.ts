import type { EvalCodeValidator } from "@anpord/schema/domain/eval-definition";
import {
  validationCapture,
  validationExecution,
} from "@anpord/schema/domain/eval-validations";
import { Clock, Effect, Random } from "effect";
import type { ScoreRequest } from "../../ports/scorer";
import { shellQuote } from "../harness/process";
import { executeValidation, publishValidation } from "./validation";
import { completeValidations, legacyValidation } from "./validation-records";
import { answerEnv, processError, resultStatus } from "./validator-protocol";

export const scoreValidator = (
  request: ScoreRequest & { readonly validator: typeof EvalCodeValidator.Type }
) =>
  Effect.gen(function* () {
    const started = yield* Clock.currentTimeMillis;
    const suffix = yield* Random.nextIntBetween(0x10_00_00_00, 0x7f_ff_ff_ff);
    const path = `${request.sandbox.home}/.anpord-validator-${suffix.toString(16)}.mjs`;
    const manifest = request.validator.manifest ?? [
      { index: 0, name: request.validator.name },
    ];
    const records = manifest.map((check, index) => ({
      ...validationExecution(
        {
          ...check,
          id: `${request.validationPrefix ?? ""}code:${check.index}`,
          kind: "code",
        },
        index === 0 ? started : null
      ),
      status: index === 0 ? ("running" as const) : ("queued" as const),
    }));
    yield* request.sandbox.writeFile(path, request.validator.source);
    const execution = yield* executeValidation({
      sandbox: request.sandbox,
      command: `node ${shellQuote(path)}`,
      options: {
        cwd: request.workspace,
        timeoutMs: 300_000,
        env: {
          ...request.env,
          ...answerEnv(request.sandbox),
          ANPORD_PREPARE_VALUE: JSON.stringify(request.prepared ?? {}),
        },
      },
      records,
      prefix: request.validationPrefix,
      observe: request.onValidation,
    });
    const finished = yield* Clock.currentTimeMillis;
    const capture = validationCapture(request.validator.capture !== false);
    const validations = completeValidations(
      request.validator.manifest === undefined
        ? execution.records.map((record) =>
            legacyValidation(record, execution, finished, capture)
          )
        : execution.records,
      processError(execution),
      finished,
      execution.stderr ? capture(execution.stderr, "text") : null,
      execution.exitCode
    );
    const failed = validations.some((record) => record.status === "failed");
    const invalid =
      validations.some((record) => record.status === "error") ||
      processError(execution) !== null;
    for (const record of validations) {
      yield* publishValidation(record, request.onValidation);
    }
    return {
      artifacts: [],
      commandCount: request.commandCount,
      modelMs: request.modelMs,
      sandboxMs: 0,
      exitCode: invalid ? execution.exitCode || -1 : Number(failed),
      status: invalid ? ("void" as const) : resultStatus(!failed),
      validations,
      verifySteps: [],
      voidFields: invalid ? ["validator"] : [],
    };
  });
