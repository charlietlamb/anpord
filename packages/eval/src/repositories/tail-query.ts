import { Database } from "@anpord/db/client";
import { evalBatch } from "@anpord/db/schema/evals/eval-batches";
import { evalEvent } from "@anpord/db/schema/evals/eval-events";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import {
  EVAL_TAIL_PAGE,
  type EvalBatchTail,
  type EvalTailMark,
} from "@anpord/schema/domain/eval-tail";
import type { HarnessEvent } from "@anpord/schema/domain/harness-event";
import { and, asc, eq, gt, or } from "drizzle-orm";
import { Effect, Option } from "effect";
import { asEntries } from "../domain/journal-entries";
import { advance, markFor, type TailEvent } from "../domain/tail";
import { tryStore } from "./query";

export const tailQuery = Effect.gen(function* () {
  const db = yield* Database;

  return (input: {
    readonly after: readonly EvalTailMark[];
    readonly batchId: string;
    readonly organizationId: string;
  }) =>
    Effect.gen(function* () {
      const trials = yield* tryStore("tail.trials", () =>
        db
          .select({
            ordinal: evalTrial.ordinal,
            run: evalRun.internalId,
            status: evalBatch.status,
            trial: evalTrial.internalId,
            trialStatus: evalTrial.status,
          })
          .from(evalBatch)
          .leftJoin(evalRun, eq(evalRun.batchInternalId, evalBatch.internalId))
          .leftJoin(evalTrial, eq(evalTrial.runInternalId, evalRun.internalId))
          .where(
            and(
              eq(evalBatch.internalId, input.batchId),
              eq(evalBatch.organizationId, input.organizationId)
            )
          )
      );

      const [first] = trials;

      if (first === undefined) {
        return Option.none<EvalBatchTail>();
      }

      const running = first.status === "running";
      const settled = trials.filter(
        (row) =>
          row.trialStatus !== null &&
          row.trialStatus !== "queued" &&
          row.trialStatus !== "running"
      ).length;
      const addressed = new Map(
        trials.flatMap((row) =>
          row.run === null || row.ordinal === null || row.trial === null
            ? []
            : [[row.trial, { ordinal: row.ordinal, run: row.run }] as const]
        )
      );

      const rows =
        addressed.size === 0
          ? []
          : yield* tryStore("tail.events", () =>
              db
                .select()
                .from(evalEvent)
                .where(
                  or(
                    ...[...addressed].map(([trial, address]) =>
                      and(
                        eq(evalEvent.trialInternalId, trial),
                        gt(evalEvent.seq, markFor(input.after, address))
                      )
                    )
                  )
                )
                .orderBy(
                  asc(evalEvent.at),
                  asc(evalEvent.trialInternalId),
                  asc(evalEvent.seq)
                )
                .limit(EVAL_TAIL_PAGE)
            );

      const events = rows.flatMap((row): readonly TailEvent[] => {
        const address = addressed.get(row.trialInternalId);
        return address === undefined
          ? []
          : [{ ...address, event: row.payload as HarnessEvent, seq: row.seq }];
      });

      return Option.some<EvalBatchTail>({
        events: events.flatMap(({ event, ...address }) =>
          asEntries(event).map((entry) => ({ ...address, entry }))
        ),
        next: advance(input.after, events),
        running,
        settled,
      });
    }).pipe(
      Effect.withSpan("TailQuery.read", { attributes: { batchId: input.batchId } })
    );
});
