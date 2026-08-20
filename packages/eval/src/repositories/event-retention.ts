import { Database } from "@anpord/db/client";
import { evalBaseline } from "@anpord/db/schema/evals/eval-baselines";
import { evalCell } from "@anpord/db/schema/evals/eval-cells";
import { evalEvent } from "@anpord/db/schema/evals/eval-events";
import { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { and, lt, notInArray, sql } from "drizzle-orm";
import { Clock, Context, Effect, Layer } from "effect";
import type { EvalStoreError } from "../domain/errors";
import { tryStore } from "./query";

export interface EventRetentionShape {
  /** Deletes journals older than the cutoff, except those a baseline depends
   * on. Returns how many rows went. */
  readonly sweep: (input: {
    readonly olderThanDays: number;
  }) => Effect.Effect<number, EvalStoreError>;
}

export class EventRetention extends Context.Tag("@anpord/eval/EventRetention")<
  EventRetention,
  EventRetentionShape
>() {}

const MILLIS_PER_DAY = 86_400_000;

export const EventRetentionLive = Layer.effect(
  EventRetention,
  Effect.gen(function* () {
    const db = yield* Database;

    const sweep = (input: { readonly olderThanDays: number }) =>
      Effect.gen(function* () {
        const now = yield* Clock.currentTimeMillis;
        const cutoff = new Date(now - input.olderThanDays * MILLIS_PER_DAY);

        /* A promoted cell keeps its journal for as long as it is the
           reference. Sweeping it would leave a baseline whose evidence cannot
           be inspected, which is the state a regression argument is least
           able to survive. */
        const protectedTrials = db
          .select({ internalId: evalTrial.internalId })
          .from(evalTrial)
          .innerJoin(
            evalCell,
            sql`${evalTrial.cellInternalId} = ${evalCell.internalId}`
          )
          .innerJoin(
            evalBaseline,
            sql`${evalBaseline.cellInternalId} = ${evalCell.internalId}`
          );

        const deleted = yield* tryStore("event.sweep", () =>
          db
            .delete(evalEvent)
            .where(
              and(
                lt(evalEvent.at, cutoff),
                notInArray(evalEvent.trialInternalId, protectedTrials)
              )
            )
            .returning({ internalId: evalEvent.internalId })
        );

        return deleted.length;
      }).pipe(
        Effect.withSpan("EventRetention.sweep", {
          attributes: { olderThanDays: input.olderThanDays },
        })
      );

    return EventRetention.of({ sweep });
  })
);
