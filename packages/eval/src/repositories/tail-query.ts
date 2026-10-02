import { Database } from "@sphynx/db/client";
import { evalBatch } from "@sphynx/db/schema/evals/eval-batches";
import { evalEvent } from "@sphynx/db/schema/evals/eval-events";
import { evalRun } from "@sphynx/db/schema/evals/eval-runs";
import { evalTrial } from "@sphynx/db/schema/evals/eval-trials";
import {
  EVAL_TAIL_PAGE,
  type EvalBatchTail,
  type EvalTailMark,
} from "@sphynx/schema/domain/eval-tail";
import type { HarnessEvent } from "@sphynx/schema/domain/harness-event";
import { and, eq, gt, or, sql } from "drizzle-orm";
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
          : yield* tryStore("tail.events", async () => {
              const matched = db
                .select({
                  at: evalEvent.at,
                  payload: evalEvent.payload,
                  seq: evalEvent.seq,
                  trialInternalId: evalEvent.trialInternalId,
                })
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
                );
              const sorted = await db.execute<{
                readonly payload: unknown;
                readonly seq: number;
                readonly trial_internal_id: string;
              }>(
                sql`with matched as materialized (${matched}) select payload, seq, trial_internal_id from matched order by at, trial_internal_id, seq limit ${EVAL_TAIL_PAGE}`
              );
              return sorted.rows.map((row) => ({
                payload: row.payload,
                seq: row.seq,
                trialInternalId: row.trial_internal_id,
              }));
            });

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
      Effect.withSpan("TailQuery.read", {
        attributes: { batchId: input.batchId },
      })
    );
});
