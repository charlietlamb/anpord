import type { Distribution } from "./distribution";

type Verdict = "improved" | "incomparable" | "regressed" | "unchanged";

export interface Comparison {
  readonly baselinePassRate: number;
  readonly candidatePassRate: number;
  readonly delta: number;
  /* An agent that became unreliable without becoming wrong is a regression no
     pass-rate comparison can express. */
  readonly determinismLost: boolean;
  readonly reason: string | null;
  readonly verdict: Verdict;
}

export interface VersionedComparison extends Comparison {
  readonly baselineHarnessVersion: string;
  readonly baselineProfileVersion: string | null;
  readonly candidateHarnessVersion: string;
  readonly candidateProfileVersion: string | null;
}

const MATERIAL_DELTA = 0.2;

const incomparable = (reason: string): Comparison => ({
  baselinePassRate: 0,
  candidatePassRate: 0,
  delta: 0,
  determinismLost: false,
  reason,
  verdict: "incomparable",
});

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

  /* Determinism needs more than one trial, so a single-trial candidate cannot
     have lost it. */
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
    /* Instability alone is a regression: the pass rate would call it unchanged. */
    reason: determinismLost ? "the cell stopped agreeing with itself" : null,
    verdict: determinismLost ? "regressed" : "unchanged",
  };
};
