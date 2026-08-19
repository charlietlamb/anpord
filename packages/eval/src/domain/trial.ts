import { Schema } from "effect";

/**
 * `void` is a status of its own and never a flavour of `failed`.
 *
 * A trial whose commands never executed says nothing about the harness. Scoring
 * it as a failure lets a broken provider report a clean pass rate, which is the
 * failure this whole product exists to correct.
 *
 * `exceeded` is likewise distinct: a task the agent might have solved with more
 * budget is a different finding from one it got wrong.
 */
export const TrialStatus = Schema.Literal(
  "queued",
  "running",
  "passed",
  "failed",
  "void",
  "exceeded"
);
export type TrialStatus = typeof TrialStatus.Type;

export const TrialOutcome = Schema.Struct({
  commandCount: Schema.Int,
  exitCode: Schema.Int,
  modelMs: Schema.Int,
  passed: Schema.Boolean,
  sandboxMs: Schema.Int,
  status: TrialStatus,
  voidFields: Schema.Array(Schema.String),
});
export type TrialOutcome = typeof TrialOutcome.Type;

/** Signatures of a command that never ran, as opposed to one that ran and
 * failed. `fork/exec ...: no such file or directory` is the exact string a
 * Daytona sandbox returns when the working directory does not exist yet, and
 * reading two of those as agreement is how a replication once reported a
 * perfect score against a provider where nothing had executed. */
const VOID_PATTERNS: readonly RegExp[] = [
  /fork\/exec .*: no such file or directory/i,
  /^\s*$/,
  /command not found/i,
  /cannot execute binary file/i,
  /permission denied/i,
];

export const isVoidValue = (value: string) =>
  VOID_PATTERNS.some((pattern) => pattern.test(value));

export interface VoidCheck {
  readonly fields: readonly string[];
  readonly voided: boolean;
}

export const checkVoid = (
  fingerprint: Readonly<Record<string, string>>
): VoidCheck => {
  const fields = Object.entries(fingerprint)
    .filter(([, value]) => isVoidValue(String(value)))
    .map(([key]) => key);

  return { fields, voided: fields.length > 0 };
};

export interface ScoreInput {
  readonly commandCount: number;
  readonly exitCode: number;
  readonly fingerprint: Readonly<Record<string, string>>;
  readonly modelMs: number;
  readonly sandboxMs: number;
}

/** The gate runs before the verdict, never after. A voided trial carries no
 * pass or fail, because it has no evidence to carry one. */
export const outcomeOf = (input: ScoreInput): TrialOutcome => {
  const check = checkVoid(input.fingerprint);

  if (check.voided) {
    return {
      commandCount: input.commandCount,
      exitCode: input.exitCode,
      modelMs: input.modelMs,
      passed: false,
      sandboxMs: input.sandboxMs,
      status: "void",
      voidFields: check.fields,
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
    voidFields: [],
  };
};
