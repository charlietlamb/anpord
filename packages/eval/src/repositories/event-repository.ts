import { Database } from "@anpord/db/client";
import { evalEvent } from "@anpord/db/schema/evals/eval-events";
import { IdGenerator } from "@anpord/ids/id";
import { asc, eq } from "drizzle-orm";
import { Context, Effect, Layer } from "effect";
import type { EvalStoreError } from "../domain/errors";
import type { HarnessEvent } from "../domain/harness-event";
import { tryStore } from "./query";

type EventRow = typeof evalEvent.$inferSelect;

export interface AppendEvents {
  readonly events: readonly HarnessEvent[];
  readonly trialInternalId: string;
}

export interface EventRepositoryShape {
  /** Append-only, and written in one statement rather than one per event: a
   * single agent run produces hundreds, and this is the highest-volume table
   * in the system by a wide margin. */
  readonly append: (
    input: AppendEvents
  ) => Effect.Effect<number, EvalStoreError>;
  readonly listByTrial: (
    trialInternalId: string
  ) => Effect.Effect<readonly EventRow[], EvalStoreError>;
}

export class EventRepository extends Context.Tag(
  "@anpord/eval/EventRepository"
)<EventRepository, EventRepositoryShape>() {}

export const EventRepositoryLive = Layer.effect(
  EventRepository,
  Effect.gen(function* () {
    const db = yield* Database;
    const ids = yield* IdGenerator;

    const append = (input: AppendEvents) =>
      Effect.gen(function* () {
        if (input.events.length === 0) {
          return 0;
        }

        const rows = yield* Effect.forEach(input.events, (event, index) =>
          ids.generate("evalEvent").pipe(
            Effect.map((internalId) => ({
              internalId,
              kind: event._tag,
              payload: event,
              /* The sequence is the journal's order, and it is assigned here
                 rather than taken from a timestamp: two events inside one
                 millisecond would otherwise be unorderable. */
              seq: index,
              trialInternalId: input.trialInternalId,
            }))
          )
        );

        yield* tryStore("event.append", () =>
          db.insert(evalEvent).values(rows)
        );

        return rows.length;
      }).pipe(
        Effect.withSpan("EventRepository.append", {
          attributes: { events: input.events.length },
        })
      );

    return EventRepository.of({
      append,
      listByTrial: (trialInternalId) =>
        tryStore("event.listByTrial", () =>
          db
            .select()
            .from(evalEvent)
            .where(eq(evalEvent.trialInternalId, trialInternalId))
            .orderBy(asc(evalEvent.seq))
        ),
    });
  })
);
