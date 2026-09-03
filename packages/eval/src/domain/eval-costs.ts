import type { EvalCosts } from "@anpord/schema/domain/evals";
import { dollarsOf, summaryOf } from "./cost-arithmetic";
import type { CostClassification, CostComponent } from "./cost-component";

/**
 * Stored cost rows as a reader sees them.
 *
 * The classification travels with each amount rather than being resolved into
 * one number here: a caller showing four layers needs them apart, and a caller
 * showing a total has to choose which basis it is totalling. Deciding either
 * at this seam would take that choice away from both.
 */
export const costsOf = (
  rows: readonly {
    readonly amountNanos: bigint | null;
    readonly classification: string;
    readonly component: string;
    readonly detail: Record<string, unknown>;
    readonly explanation: string;
    readonly source: string;
  }[]
): EvalCosts | null => {
  if (rows.length === 0) {
    return null;
  }

  const components = rows.map((row) => ({
    amountNanos: row.amountNanos,
    classification: row.classification as CostClassification,
    component: row.component as CostComponent["component"],
    detail: row.detail,
    explanation: row.explanation,
    source: row.source,
  }));

  return {
    ...summaryOf(components),
    components: components.map((part) => ({
      classification: part.classification,
      component: part.component,
      detail: part.detail,
      explanation: part.explanation,
      source: part.source,
      /* Null stays null across the wire. A zero here would be a claim that
         something was free, which is the one thing none of this may say. */
      usd: part.amountNanos === null ? null : dollarsOf(part.amountNanos),
    })),
  };
};

/**
 * What a set of trials cost together.
 *
 * Components are concatenated rather than merged, so a run of thirty-six
 * trials reports thirty-six model estimates that sum to one figure and
 * thirty-six managed sandboxes that sum to nothing. Merging them would have to
 * decide what a "managed" total means, and there is no answer: they are not
 * zero, and they are not addable.
 */
export const rollUp = (
  each: readonly ReturnType<typeof costsOf>[]
): ReturnType<typeof costsOf> => {
  const found = each.filter((one) => one !== null);

  if (found.length === 0) {
    return null;
  }

  const merged = new Map<
    string,
    { readonly classification: string; usd: number | null }
  >();

  for (const one of found) {
    for (const part of one.components) {
      const seen = merged.get(part.component);
      const usd =
        part.usd === null ? (seen?.usd ?? null) : (seen?.usd ?? 0) + part.usd;

      merged.set(part.component, {
        classification:
          seen === undefined || seen.classification === part.classification
            ? part.classification
            : /* Trials of one cell can differ -- one priced, one not -- and a
                 cell that is partly unknown is unknown, not partly estimated. */
              "unknown",
        usd,
      });
    }
  }

  const components = [...merged.entries()].map(([component, part]) => ({
    classification: part.classification as CostClassification,
    component: component as CostComponent["component"],
    detail: {},
    explanation: "",
    source: "aggregate",
    usd: part.usd,
  }));

  return {
    allocatedUsd: found.reduce((total, one) => total + one.allocatedUsd, 0),
    components,
    estimatedEquivalentUsd: found.reduce(
      (total, one) => total + one.estimatedEquivalentUsd,
      0
    ),
    incomplete: found.some((one) => one.incomplete),
    knownActualUsd: found.reduce((total, one) => total + one.knownActualUsd, 0),
  };
};
