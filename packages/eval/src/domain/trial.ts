import { type Option, Schema } from "effect";

/* `void` is its own status, never a flavour of `failed`: a trial whose commands
   never executed is not evidence about the harness. */
export const TrialStatus = Schema.Literal(
  "queued",
  "running",
  "passed",
  "failed",
  "void"
);
export type TrialStatus = typeof TrialStatus.Type;

/* Decoded, not asserted: the column has no check constraint, so an older deploy's
   row may carry a status this build does not name. */
export const trialStatusOf: (value: string) => Option.Option<TrialStatus> =
  Schema.decodeUnknownOption(TrialStatus);

export const VerifyStepResult = Schema.Struct({
  command: Schema.String,
  exitCode: Schema.Int,
});
export type VerifyStepResult = typeof VerifyStepResult.Type;

export const TrialOutcome = Schema.Struct({
  commandCount: Schema.Int,
  exitCode: Schema.Int,
  modelMs: Schema.Int,
  passed: Schema.Boolean,
  sandboxMs: Schema.Int,
  status: TrialStatus,
  /* In run order, up to and including the one that failed. */
  verifySteps: Schema.Array(VerifyStepResult),
  voidFields: Schema.Array(Schema.String),
});
export type TrialOutcome = typeof TrialOutcome.Type;

/* `fork/exec` is the exact string a Daytona sandbox returns when the working
   directory does not exist. */
const VOID_PATTERNS: readonly RegExp[] = [
  /fork\/exec .*: no such file or directory/i,
  /^\s*$/,
  /command not found/i,
  /cannot execute binary file/i,
  /permission denied/i,
];

const configuredPatterns = (extra: readonly string[]): readonly RegExp[] =>
  extra.flatMap((source) => {
    try {
      return [new RegExp(source, "i")];
    } catch {
      return [];
    }
  });

const isVoidValue = (value: string, extra: readonly string[] = []): boolean =>
  [...VOID_PATTERNS, ...configuredPatterns(extra)].some((pattern) =>
    pattern.test(value)
  );

export interface VoidCheck {
  readonly fields: readonly string[];
  readonly voided: boolean;
}

const checkVoid = (
  fingerprint: Readonly<Record<string, string>>,
  extra: readonly string[] = []
): VoidCheck => {
  const fields = Object.entries(fingerprint)
    .filter(([, value]) => isVoidValue(String(value), extra))
    .map(([key]) => key);

  return { fields, voided: fields.length > 0 };
};

/* A runner that found nothing to run exits zero and says so. */
const VACUOUS_PATTERNS: readonly RegExp[] = [
  /^\s*(?:ℹ\s*)?tests\s+0\s*$/m,
  /\b0\s+(?:tests?|specs?|examples?)\b/i,
  /\bno tests? (?:found|ran|to run|were found)\b/i,
];

const isVacuous = (output: string) =>
  VACUOUS_PATTERNS.some((pattern) => pattern.test(output));

export interface ScoreInput {
  readonly commandCount: number;
  readonly exitCode: number;
  readonly fingerprint: Readonly<Record<string, string>>;
  readonly modelMs: number;
  readonly sandboxMs: number;
  readonly verifySteps?: readonly VerifyStepResult[];
  readonly voidPatterns?: readonly string[];
}

/* The void gate runs before the verdict, never after. */
export const outcomeOf = (input: ScoreInput): TrialOutcome => {
  const check = checkVoid(input.fingerprint, input.voidPatterns ?? []);
  const verifySteps = input.verifySteps ?? [];

  if (check.voided) {
    return {
      commandCount: input.commandCount,
      exitCode: input.exitCode,
      modelMs: input.modelMs,
      passed: false,
      sandboxMs: input.sandboxMs,
      status: "void",
      verifySteps,
      voidFields: check.fields,
    };
  }

  /* A zero exit from a runner that found no tests is absence of evidence, not a pass. */
  const vacuous = Object.entries(input.fingerprint)
    .filter(([, value]) => isVacuous(String(value)))
    .map(([key]) => key);

  if (vacuous.length > 0) {
    return {
      commandCount: input.commandCount,
      exitCode: input.exitCode,
      modelMs: input.modelMs,
      passed: false,
      sandboxMs: input.sandboxMs,
      status: "void",
      verifySteps,
      voidFields: vacuous,
    };
  }

  const passed = input.exitCode === 0;

  return {
    commandCount: input.commandCount,
    exitCode: input.exitCode,
    modelMs: input.modelMs,
    passed,
    sandboxMs: input.sandboxMs,
    status: passed ? "passed" : "failed",
    verifySteps,
    voidFields: [],
  };
};
