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

/** Extra signatures, supplied per deployment.
 *
 * A new provider returns its own wording for a command that never ran, and
 * without this the only way to teach the gate is a release. An unreadable
 * pattern is dropped rather than thrown: a typo in configuration should
 * narrow the gate, never stop trials being scored at all. */
const configuredPatterns = (extra: readonly string[]): readonly RegExp[] =>
  extra.flatMap((source) => {
    try {
      return [new RegExp(source, "i")];
    } catch {
      return [];
    }
  });

export const isVoidValue = (
  value: string,
  extra: readonly string[] = []
): boolean =>
  [...VOID_PATTERNS, ...configuredPatterns(extra)].some((pattern) =>
    pattern.test(value)
  );

export interface VoidCheck {
  readonly fields: readonly string[];
  readonly voided: boolean;
}

export const checkVoid = (
  fingerprint: Readonly<Record<string, string>>,
  extra: readonly string[] = []
): VoidCheck => {
  const fields = Object.entries(fingerprint)
    .filter(([, value]) => isVoidValue(String(value), extra))
    .map(([key]) => key);

  return { fields, voided: fields.length > 0 };
};

/** A runner that found nothing to run exits zero and says so.
 *
 * Scoring that as a pass is the worst failure this system can have: a cell
 * where the workspace was empty, or the files landed somewhere else, reports
 * every trial as passing and reports the cell deterministic, because all the
 * trials agree and none of them did anything. Maximum confidence, no evidence.
 */
const VACUOUS_PATTERNS: readonly RegExp[] = [
  /^\s*(?:ℹ\s*)?tests\s+0\s*$/m,
  /\b0\s+(?:tests?|specs?|examples?)\b/i,
  /\bno tests? (?:found|ran|to run|were found)\b/i,
];

export const isVacuous = (output: string) =>
  VACUOUS_PATTERNS.some((pattern) => pattern.test(output));

export interface ScoreInput {
  readonly commandCount: number;
  readonly exitCode: number;
  readonly fingerprint: Readonly<Record<string, string>>;
  readonly modelMs: number;
  readonly sandboxMs: number;
  /** Extra void signatures for this deployment, from configuration. */
  readonly voidPatterns?: readonly string[];
}

/** The gate runs before the verdict, never after. A voided trial carries no
 * pass or fail, because it has no evidence to carry one. */
export const outcomeOf = (input: ScoreInput): TrialOutcome => {
  const check = checkVoid(input.fingerprint, input.voidPatterns ?? []);

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

  /* A zero exit from a runner that found no tests is not a pass. It is the
     same absence of evidence a non-run is, so it voids rather than scores. */
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
    voidFields: [],
  };
};
