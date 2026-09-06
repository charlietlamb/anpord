import type { EvalCosts } from "@anpord/schema/domain/evals";
import { Option } from "effect";
import { dollarsOf, summaryOf } from "./cost-arithmetic";
import {
  type CostClassification,
  type CostComponent,
  type CostComponentName,
  classificationOf,
  componentNameOf,
} from "./cost-component";

/* Unknown, never dropped and never guessed. A classification this build cannot
   name matches no branch of the summary, so a cast let its amount vanish from
   every total while `incomplete` stayed false -- a figure short by the whole
   row, presented as complete. Unknown is the one classification that says so. */
const storedComponent = (row: {
  readonly amountNanos: bigint | null;
  readonly classification: string;
  readonly component: string;
  readonly detail: Record<string, unknown>;
  readonly explanation: string;
  readonly source: string;
}): Option.Option<CostComponent> =>
  Option.map(componentNameOf(row.component), (component) => {
    const classification = classificationOf(row.classification);

    return {
      /* An amount whose basis is unreadable is not a figure to sum: keeping it
         would add it to a total that cannot say what it measures. */
      amountNanos: Option.isSome(classification) ? row.amountNanos : null,
      classification: Option.getOrElse(
        classification,
        () => "unknown" as const
      ),
      component,
      detail: row.detail,
      explanation: row.explanation,
      source: row.source,
    };
  });

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

  /* A row naming a component this build cannot attribute is dropped: it has
     nowhere to be shown and nothing to merge with. One naming an unreadable
     classification is kept and marked unknown, which is what raises
     `incomplete` -- the reader is told the figure is short rather than shown a
     total that silently lost it. */
  const components = rows.flatMap((row) =>
    Option.toArray(storedComponent(row))
  );

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

  /* Keyed and valued by the union rather than by string, so the entries come
     back out already typed and the map cannot hold a name the wire contract
     does not have. */
  const merged = new Map<
    CostComponentName,
    { readonly classification: CostClassification; usd: number | null }
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
    classification: part.classification,
    component,
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
