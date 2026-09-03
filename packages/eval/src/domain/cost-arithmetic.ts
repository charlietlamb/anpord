import type { CostClassification, CostComponent } from "./cost-component";

/* Rates are quoted per million tokens and a cheap trial costs a fraction of a
   cent, so cents cannot hold one and a float summed across a run drifts.
   Nano-units are exact under addition and hold nine billion of them. */
const NANOS = 1_000_000_000;

export const nanosOf = (amount: number) => BigInt(Math.round(amount * NANOS));

/** Back to dollars for display. Lossy above about nine million dollars, which
 * a trial is not; a lifetime total should sum in nanos and convert once. */
export const dollarsOf = (nanos: bigint) => Number(nanos) / NANOS;

/**
 * What a set of trials cost, kept apart by how it is known.
 *
 * Three sums rather than one total: adding an estimate to an actual charge and
 * an allocated share produces a number that means none of the three. The PRD
 * calls this out and it is the whole reason there is no `totalUsd`.
 */
export const summaryOf = (components: readonly CostComponent[]) => {
  const summed = (of: CostClassification) =>
    components
      .filter((part) => part.classification === of)
      .reduce((total, part) => total + (part.amountNanos ?? 0n), 0n);

  return {
    allocatedUsd: dollarsOf(summed("allocated")),
    estimatedEquivalentUsd: dollarsOf(summed("estimate")),
    /* Unknown only. Included and managed are known states rather than missing
       ones, and a managed sandbox is the ordinary case here: raising the flag
       for it would leave it on for every run, which says nothing. */
    incomplete: components.some((part) => part.classification === "unknown"),
    knownActualUsd: dollarsOf(summed("actual")),
  };
};
