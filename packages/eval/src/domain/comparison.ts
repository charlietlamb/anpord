import type { Distribution } from "./distribution";

type Verdict = "improved" | "incomparable" | "regressed" | "unchanged";

export interface Comparison {
  readonly baselinePassRate: number;
  readonly candidatePassRate: number;
  readonly delta: number;
  /** True when the pass rate held but the cell stopped agreeing with itself.
   * An agent that became unreliable without becoming wrong is a regression no
   * score can express, and it is invisible to anything comparing two numbers. */
  readonly determinismLost: boolean;
  readonly reason: string | null;
  readonly verdict: Verdict;
}

export interface VersionedComparison extends Comparison {
  readonly baselineHarnessVersion: string;
  readonly candidateHarnessVersion: string;
}

/** How far two pass rates must differ before the difference is a finding. */
const MATERIAL_DELTA = 0.2;

const incomparable = (reason: string): Comparison => ({
  baselinePassRate: 0,
  candidatePassRate: 0,
  delta: 0,
  determinismLost: false,
  reason,
  verdict: "incomparable",
});

/** Whether a cell got worse than its baseline. */
export const compare = (
  baseline: Distribution,
  candidate: Distribution
): Comparison => {
  if (baseline.scored === 0) {
    return incomparable("the baseline has no scored trials");
  }

  if (candidate.scored === 0) {
    return incomparable("this run has no scored trials");
  }

  const delta = candidate.passRate - baseline.passRate;

  /* Determinism is only claimed from more than one trial, so a baseline that
     never had it cannot lose it. Reading `deterministic: false` on a single
     trial as a loss would flag every first comparison. */
  const determinismLost =
    baseline.deterministic && !candidate.deterministic && candidate.scored > 1;

  if (delta <= -MATERIAL_DELTA) {
    return {
      baselinePassRate: baseline.passRate,
      candidatePassRate: candidate.passRate,
      delta,
      determinismLost,
      reason: null,
      verdict: "regressed",
    };
  }

  if (delta >= MATERIAL_DELTA) {
    return {
      baselinePassRate: baseline.passRate,
      candidatePassRate: candidate.passRate,
      delta,
      determinismLost,
      reason: null,
      verdict: "improved",
    };
  }

  return {
    baselinePassRate: baseline.passRate,
    candidatePassRate: candidate.passRate,
    delta,
    determinismLost,
    /* A cell that still passes as often but no longer agrees with itself is
       reported as a regression on its own, because the pass rate alone would
       call it unchanged and the instability is the finding. */
    reason: determinismLost ? "the cell stopped agreeing with itself" : null,
    verdict: determinismLost ? "regressed" : "unchanged",
  };
};
