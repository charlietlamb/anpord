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
      /* An unreadable basis makes the amount unsummable. */
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

  /* An unnameable component is dropped; an unreadable classification is kept as
     unknown, which is what raises `incomplete`. */
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
      /* Null stays null across the wire; zero would claim it was free. */
      usd: part.amountNanos === null ? null : dollarsOf(part.amountNanos),
    })),
  };
};

export const rollUp = (
  each: readonly ReturnType<typeof costsOf>[]
): ReturnType<typeof costsOf> => {
  const found = each.filter((one) => one !== null);

  if (found.length === 0) {
    return null;
  }

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
            : /* A cell that is partly unknown is unknown, not partly estimated. */
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
