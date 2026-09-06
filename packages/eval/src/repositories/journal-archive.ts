import { Database } from "@anpord/db/client";
import { evalEvent } from "@anpord/db/schema/evals/eval-events";
import { evalTrialJournal } from "@anpord/db/schema/evals/eval-trial-journal";
import { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { asc, eq, inArray, lt, max, notInArray, sql } from "drizzle-orm";
import { Context, Effect, Layer } from "effect";
import { EvalStoreError } from "../domain/errors";
import type { HarnessEvent } from "../domain/harness-event";
import { decodeArchivedJournal } from "../domain/journal-archive";
import { groupByTrial } from "./event-row";
import { tryStore } from "./query";

/* Also deletes from `eval_event`: the archive row and the rows it replaces must
   change in one transaction, or a reader sees both journals or neither. */

/* Statuses that can still receive an event. */
const LIVE_STATUSES = ["queued", "running"];

const ARCHIVE_VERSION = 1;

export interface CompactJournals {
  readonly limit: number;
  readonly olderThan: Date;
}

export interface JournalArchiveShape {
  /* A batch as long as `limit` means there may be more. */
  readonly compact: (
    input: CompactJournals
  ) => Effect.Effect<number, EvalStoreError>;

  readonly findByTrials: (
    trialInternalIds: readonly string[]
  ) => Effect.Effect<
    ReadonlyMap<string, readonly HarnessEvent[]>,
    EvalStoreError
  >;
}

export class JournalArchive extends Context.Tag("@anpord/eval/JournalArchive")<
  JournalArchive,
  JournalArchiveShape
>() {}

export const JournalArchiveLive = Layer.effect(
  JournalArchive,
  Effect.gen(function* () {
    const db = yield* Database;

    const compact = (input: CompactJournals) =>
      tryStore("journal.compact", () =>
        db.transaction(async (tx) => {
          /* Narrowed by the index on `at` before grouping. */
          const aged = tx
            .selectDistinct({ trialInternalId: evalEvent.trialInternalId })
            .from(evalEvent)
            .where(lt(evalEvent.at, input.olderThan))
            .as("aged");

          const candidates = await tx
            .select({ trialInternalId: aged.trialInternalId })
            .from(aged)
            .innerJoin(
              evalTrial,
              eq(evalTrial.internalId, aged.trialInternalId)
            )
            .innerJoin(
              evalEvent,
              eq(evalEvent.trialInternalId, aged.trialInternalId)
            )
            .where(notInArray(evalTrial.status, LIVE_STATUSES))
            .groupBy(aged.trialInternalId)
            .having(lt(max(evalEvent.at), input.olderThan))
            .limit(input.limit);

          const trialInternalIds = candidates.map((row) => row.trialInternalId);

          if (trialInternalIds.length === 0) {
            return 0;
          }

          const rows = await tx
            .select()
            .from(evalEvent)
            .where(inArray(evalEvent.trialInternalId, trialInternalIds))
            .orderBy(asc(evalEvent.trialInternalId), asc(evalEvent.seq));

          const archives = [...groupByTrial(rows)].map(
            ([trialInternalId, events]) => ({
              eventCount: events.length,
              events,
              trialInternalId,
            })
          );

          await tx
            .insert(evalTrialJournal)
            .values(archives)
            .onConflictDoUpdate({
              set: {
                compactedAt: sql`now()`,
                eventCount: sql`excluded.event_count`,
                events: sql`excluded.events`,
              },
              target: evalTrialJournal.trialInternalId,
            });

          await tx
            .delete(evalEvent)
            .where(inArray(evalEvent.trialInternalId, trialInternalIds));

          return archives.length;
        })
      ).pipe(
        Effect.withSpan("JournalArchive.compact", {
          attributes: { limit: input.limit },
        })
      );

    const findByTrials = (trialInternalIds: readonly string[]) =>
      Effect.gen(function* () {
        const rows = yield* tryStore("journal.findByTrials", () =>
          db
            .select()
            .from(evalTrialJournal)
            .where(
              inArray(evalTrialJournal.trialInternalId, [...trialInternalIds])
            )
        );

        const journals = new Map<string, readonly HarnessEvent[]>();

        for (const row of rows) {
          const archived = yield* decodeArchivedJournal({
            events: row.events,
            version: ARCHIVE_VERSION,
          }).pipe(
            Effect.mapError(
              (cause) =>
                new EvalStoreError({ cause, operation: "journal.decode" })
            )
          );

          journals.set(row.trialInternalId, archived.events);
        }

        return journals as ReadonlyMap<string, readonly HarnessEvent[]>;
      }).pipe(Effect.withSpan("JournalArchive.findByTrials"));

    return JournalArchive.of({ compact, findByTrials });
  })
);
