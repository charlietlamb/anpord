import type { EvalVerifyStep } from "@sphynx/schema/domain/eval-trial";
import { stepsOf } from "@sphynx/schema/domain/verify-steps";

/* `a && b && c` reports one exit code, so a failure never says which condition
   failed; the rewrite keeps one shell, so a `cd` or `export` still carries across. */
const MARK = "@@sphynx-verify";

const MARK_LINE = new RegExp(`^${MARK} (\\d+) (\\d+)$`, "gm");

const MARK_LINES = new RegExp(`^${MARK} \\d+ \\d+\\n?`, "gm");

export interface VerifyScript {
  readonly command: string;
  readonly steps: readonly string[];
}

export const verifyScriptOf = (verifier: string): VerifyScript => {
  const steps = stepsOf(verifier);

  if (steps.length < 2) {
    return { command: verifier, steps };
  }

  const command = steps
    .map((step, index) =>
      [
        `{ ${step} ; }`,
        "__sphynx_rc=$?",
        `printf '\\n${MARK} %d %d\\n' ${index + 1} "$__sphynx_rc"`,
        '[ "$__sphynx_rc" -eq 0 ] || exit "$__sphynx_rc"',
      ].join("\n")
    )
    .join("\n");

  return { command, steps };
};

/* Steps the script never reached leave no line and are absent, not zero. */
export const stepResultsOf = (
  script: VerifyScript,
  output: string
): readonly EvalVerifyStep[] => {
  if (script.steps.length < 2) {
    return [];
  }

  return [...output.matchAll(MARK_LINE)].flatMap((match) => {
    const index = Number(match[1]) - 1;
    const command = script.steps[index];

    return command === undefined
      ? []
      : [{ command, exitCode: Number(match[2]) }];
  });
};

/* The output as the unwrapped verifier would have printed it, for the fingerprint. */
export const withoutMarks = (output: string): string =>
  output.replace(MARK_LINES, "");
