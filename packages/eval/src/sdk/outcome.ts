import type { TrialOutcome } from "../domain/trial";
import { outcomeOf } from "../domain/trial";
import type { Score } from "./define";

/** A trial's verdict from its scores.
 *
 * Routed through `outcomeOf` so the void gate decides in one place: a second
 * rule here would let a trial the gate voids be recorded as passed. */
export const outcomeFrom = (input: {
  readonly commandCount: number;
  readonly modelMs: number;
  readonly sandboxMs: number;
  readonly scores: readonly Score[];
}): TrialOutcome => {
  const answered = input.scores.filter((score) => score.score !== null);

  const passed =
    answered.length > 0 && answered.every((score) => (score.score ?? 0) >= 1);

  /* -1 is the sentinel a case with no verifier uses: nothing decided this
     trial, so it has no evidence rather than a failing one. */
  const exitCodeOf = () => {
    if (answered.length === 0) {
      return -1;
    }

    return passed ? 0 : 1;
  };

  return outcomeOf({
    commandCount: input.commandCount,
    exitCode: exitCodeOf(),
    fingerprint: {
      scores: answered.map((score) => `${score.name}=${score.score}`).join(" "),
    },
    modelMs: input.modelMs,
    sandboxMs: input.sandboxMs,
  });
};
