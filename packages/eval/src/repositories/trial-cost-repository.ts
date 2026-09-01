import { Database } from "@anpord/db/client";
import { evalTrialCost } from "@anpord/db/schema/evals/eval-trial-costs";
import { IdGenerator } from "@anpord/ids/id";
import { inArray, sql } from "drizzle-orm";
import { Context, Effect, Layer } from "effect";
import type { EvalStoreError } from "../domain/errors";
import type { CostComponent } from "../domain/trial-cost";
import { tryStore } from "./query";

interface TrialCostRow {
  readonly amountNanos: bigint | null;
  readonly classification: string;
  readonly component: string;
  readonly detail: Record<string, unknown>;
  readonly explanation: string;
  readonly source: string;
  readonly trialInternalId: string;
}

export interface TrialCostRepositoryShape {
  readonly forTrials: (
    trialInternalIds: readonly string[]
  ) => Effect.Effect<readonly TrialCostRow[], EvalStoreError>;
  readonly record: (input: {
    readonly components: readonly CostComponent[];
    readonly trialInternalId: string;
  }) => Effect.Effect<void, EvalStoreError>;
}

export class TrialCostRepository extends Context.Tag(
  "@anpord/eval/TrialCostRepository"
)<TrialCostRepository, TrialCostRepositoryShape>() {}

export const TrialCostRepositoryLive = Layer.effect(
  TrialCostRepository,
  Effect.gen(function* () {
    const db = yield* Database;
    const ids = yield* IdGenerator;

    const record = (input: {
      readonly components: readonly CostComponent[];
      readonly trialInternalId: string;
    }) =>
      Effect.gen(function* () {
        if (input.components.length === 0) {
          return;
        }

        const rows = yield* Effect.forEach(input.components, (part) =>
          ids.generate("evalTrialCost").pipe(
            Effect.map((internalId) => ({
              amountNanos: part.amountNanos,
              classification: part.classification,
              component: part.component,
              detail: part.detail as Record<string, unknown>,
              explanation: part.explanation,
              internalId,
              source: part.source,
              trialInternalId: input.trialInternalId,
            }))
          )
        );

        yield* tryStore("trialCost.record", () =>
          db
            .insert(evalTrialCost)
            .values(rows)
            /* A retry settles the same trial again, and the components it
               reports are the ones that count: the earlier attempt's are the
               ones that did not finish. */
            .onConflictDoUpdate({
              set: {
                amountNanos: sql`excluded.amount_nanos`,
                classification: sql`excluded.classification`,
                detail: sql`excluded.detail`,
                explanation: sql`excluded.explanation`,
                source: sql`excluded.source`,
              },
              target: [evalTrialCost.trialInternalId, evalTrialCost.component],
            })
        );
      }).pipe(Effect.withSpan("TrialCostRepository.record"));

    const forTrials = (trialInternalIds: readonly string[]) =>
      trialInternalIds.length === 0
        ? Effect.succeed([] as readonly TrialCostRow[])
        : tryStore("trialCost.forTrials", () =>
            db
              .select()
              .from(evalTrialCost)
              .where(
                inArray(evalTrialCost.trialInternalId, [...trialInternalIds])
              )
          ).pipe(
            Effect.map((rows) => rows as readonly TrialCostRow[]),
            Effect.withSpan("TrialCostRepository.forTrials")
          );

    return TrialCostRepository.of({ forTrials, record });
  })
);
