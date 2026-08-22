import { Database } from "@anpord/db/client";
import { evalEvent } from "@anpord/db/schema/evals/eval-events";
import { IdGenerator } from "@anpord/ids/id";
import { asc, eq, inArray } from "drizzle-orm";
import { Context, Effect, Layer } from "effect";
import type { EvalStoreError } from "../domain/errors";
import type { HarnessEvent } from "../domain/harness-event";
import { momentOf } from "../domain/harness-event";
import { tryStore } from "./query";

type EventRow = typeof evalEvent.$inferSelect;

/* The rows arrive ordered by seq, and grouping preserves that order, so a
   journal comes back in the sequence it happened rather than the sequence the
   database chose to return it. */
/* The moments are stored as columns rather than inside the payload, so a
   journal read straight out of the table has no timing on it at all. */
const withTiming = (row: EventRow): HarnessEvent => {
  const payload = row.payload as HarnessEvent;

  if (row.occurredAt === null) {
    return payload;
  }

  const at = row.occurredAt.getTime();

  return payload._tag === "Command" && row.startedAt !== null
    ? { ...payload, at, startedAt: row.startedAt.getTime() }
    : { ...payload, at };
};

const groupByTrial = (
  rows: readonly EventRow[]
): ReadonlyMap<string, readonly HarnessEvent[]> => {
  const grouped = new Map<string, HarnessEvent[]>();

  for (const row of rows) {
    const journal = grouped.get(row.trialInternalId) ?? [];

    journal.push(withTiming(row));
    grouped.set(row.trialInternalId, journal);
  }

  return grouped;
};

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
  /** Every journal in one query rather than one per trial: a cell holds
   * three trials and a fan-out would open three round trips to render one
   * screen. */
  readonly listByTrials: (
    trialInternalIds: readonly string[]
  ) => Effect.Effect<
    ReadonlyMap<string, readonly HarnessEvent[]>,
    EvalStoreError
  >;
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
              occurredAt: momentOf(event.at),
              payload: event,
              /* The sequence is the journal's order, and it is assigned here
                 rather than taken from a timestamp: two events inside one
                 millisecond would otherwise be unorderable. */
              seq: index,
              startedAt: momentOf(
                event._tag === "Command" ? event.startedAt : undefined
              ),
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

    const listByTrials = (trialInternalIds: readonly string[]) =>
      trialInternalIds.length === 0
        ? Effect.succeed(
            new Map<string, readonly HarnessEvent[]>() as ReadonlyMap<
              string,
              readonly HarnessEvent[]
            >
          )
        : tryStore("event.listByTrials", () =>
            db
              .select()
              .from(evalEvent)
              .where(inArray(evalEvent.trialInternalId, [...trialInternalIds]))
              .orderBy(asc(evalEvent.seq))
          ).pipe(Effect.map(groupByTrial));

    return EventRepository.of({
      append,
      listByTrials,
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
