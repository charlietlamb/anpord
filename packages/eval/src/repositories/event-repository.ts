import { Database } from "@anpord/db/client";
import { evalEvent } from "@anpord/db/schema/evals/eval-events";
import { IdGenerator } from "@anpord/ids/id";
import { asc, inArray } from "drizzle-orm";
import { Context, Effect, Layer } from "effect";
import type { EvalStoreError } from "../domain/errors";
import type { HarnessEvent } from "../domain/harness-event";
import { groupByTrial } from "./event-row";
import { JournalArchive } from "./journal-archive";
import { tryStore } from "./query";

export interface AppendEvents {
  readonly events: readonly HarnessEvent[];
  readonly trialInternalId: string;
}

export interface EventRepositoryShape {
  readonly append: (
    input: AppendEvents
  ) => Effect.Effect<number, EvalStoreError>;

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
    const archive = yield* JournalArchive;

    const append = (input: AppendEvents) =>
      Effect.gen(function* () {
        if (input.events.length === 0) {
          return 0;
        }

        const rows = yield* Effect.forEach(input.events, (event, index) =>
          ids.generate("evalEvent").pipe(
            Effect.map((internalId) => ({
              internalId,
              payload: event,
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

    /* A trial with no rows may have been compacted rather than never
       journalled, so the archive is asked about those before an id is
       reported absent. Only those: a hot journal never has an archive. */
    const listByTrials = (trialInternalIds: readonly string[]) =>
      Effect.gen(function* () {
        if (trialInternalIds.length === 0) {
          return new Map<string, readonly HarnessEvent[]>();
        }

        const rows = yield* tryStore("event.listByTrials", () =>
          db
            .select()
            .from(evalEvent)
            .where(inArray(evalEvent.trialInternalId, [...trialInternalIds]))
            .orderBy(asc(evalEvent.seq))
        );
        const hot = groupByTrial(rows);
        const cold = trialInternalIds.filter((id) => !hot.has(id));

        if (cold.length === 0) {
          return hot;
        }

        const archived = yield* archive.findByTrials(cold);

        return new Map([...hot, ...archived]);
      }).pipe(Effect.withSpan("EventRepository.listByTrials"));

    return EventRepository.of({ append, listByTrials });
  })
);
