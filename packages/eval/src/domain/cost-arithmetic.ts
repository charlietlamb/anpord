import type { CostClassification, CostComponent } from "./cost-component";

/* Cents cannot hold a trial costing a fraction of one, and floats drift when
   summed across a run; nanos are exact under addition. */
const NANOS = 1_000_000_000;

export const nanosOf = (amount: number) => BigInt(Math.round(amount * NANOS));

/* Lossy above about nine million dollars: sum in nanos and convert once. */
export const dollarsOf = (nanos: bigint) => Number(nanos) / NANOS;

/* Three sums, never one `totalUsd`: an estimate plus an actual charge plus an
   allocated share means none of the three. */
export const summaryOf = (components: readonly CostComponent[]) => {
  const summed = (of: CostClassification) =>
    components
      .filter((part) => part.classification === of)
      .reduce((total, part) => total + (part.amountNanos ?? 0n), 0n);

  return {
    allocatedUsd: dollarsOf(summed("allocated")),
    estimatedEquivalentUsd: dollarsOf(summed("estimate")),
    /* Included and managed are known states, not missing ones. */
    incomplete: components.some((part) => part.classification === "unknown"),
    knownActualUsd: dollarsOf(summed("actual")),
  };
};
