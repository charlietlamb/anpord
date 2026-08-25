import { stepsOf } from "@anpord/schema/domain/verify-steps";
import type { VerifyStepResult } from "./trial";

/**
 * A verifier rewritten to say which of its conditions held.
 *
 * `a && b && c` runs in one shell and reports one exit code, so on a failure
 * nothing says whether it was `a` or `c`. The same conditions, each followed
 * by a line that prints its number and exit code and stops the script if it
 * failed, run in the same shell with the same semantics -- a `cd` or an
 * `export` in one step still reaches the next -- and leave a trail the
 * output can be read back from.
 *
 * A verifier of one condition is left alone. It has nothing to tell apart,
 * and a wrapper around `bun test` would be a change to the thing it measures
 * for no finding.
 */
const MARK = "@@anpord-verify";

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
        "__anpord_rc=$?",
        `printf '\\n${MARK} %d %d\\n' ${index + 1} "$__anpord_rc"`,
        '[ "$__anpord_rc" -eq 0 ] || exit "$__anpord_rc"',
      ].join("\n")
    )
    .join("\n");

  return { command, steps };
};

/** The trail, read back. Steps the script never reached leave no line and
 * are absent, which is the truth: nothing was measured for them. */
export const stepResultsOf = (
  script: VerifyScript,
  output: string
): readonly VerifyStepResult[] => {
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

/** The output as the verifier would have printed it, for the fingerprint
 * that decides whether the verifier ran at all. */
export const withoutMarks = (output: string): string =>
  output.replace(MARK_LINES, "");
