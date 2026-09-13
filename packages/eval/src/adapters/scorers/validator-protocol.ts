import { Effect, Option, Schema } from "effect";
import {
  ANSWER_ENV,
  ANSWER_PATH,
  TRANSCRIPT_ENV,
  TRANSCRIPT_PATH,
} from "../../domain/answer-file";
import { readAnswer, transcriptOf } from "../../domain/journal";
import type { SandboxHandle } from "../../ports/sandbox";
import type { ScoreRequest } from "../../ports/scorer";

const RESULT = "ANPORD_VALIDATOR_RESULT=";

export const validatorResultOf = (output: string) => {
  const line = output.split("\n").findLast((entry) => entry.startsWith(RESULT));

  if (line === undefined) {
    return null;
  }

  return Schema.decodeUnknownOption(
    Schema.parseJson(
      Schema.Struct({
        passed: Schema.Boolean,
        message: Schema.optional(Schema.String),
      })
    )
  )(line.slice(RESULT.length)).pipe(Option.getOrNull);
};

/* Beside the workspace, not in it, so the reply never becomes part of the diff. */
export const writeAnswer = (
  sandbox: SandboxHandle,
  events: ScoreRequest["events"]
) =>
  Effect.all(
    [
      sandbox.writeFile(ANSWER_PATH(sandbox.home), readAnswer(events)),
      sandbox.writeFile(TRANSCRIPT_PATH(sandbox.home), transcriptOf(events)),
    ],
    { discard: true }
  );

export const answerEnv = (sandbox: SandboxHandle) => ({
  [ANSWER_ENV]: ANSWER_PATH(sandbox.home),
  [TRANSCRIPT_ENV]: TRANSCRIPT_PATH(sandbox.home),
});

export const resultStatus = (passed: boolean) =>
  passed ? ("passed" as const) : ("failed" as const);

export const processError = (execution: {
  invalid: boolean;
  interrupted: boolean;
  exitCode: number | null;
}) => {
  if (execution.invalid) {
    return "Invalid validation protocol";
  }
  if (execution.interrupted || execution.exitCode === null) {
    return "Validator execution interrupted before process exit";
  }
  if (execution.exitCode !== 0) {
    return `Validator process exited ${execution.exitCode}`;
  }
  return null;
};
