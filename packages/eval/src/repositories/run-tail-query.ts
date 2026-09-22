import { Database } from "@anpord/db/client";
import { evalCell } from "@anpord/db/schema/evals/eval-cells";
import { evalEvent } from "@anpord/db/schema/evals/eval-events";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { EVAL_TAIL_PAGE } from "@anpord/schema/domain/eval-tail";
import type { HarnessEvent } from "@anpord/schema/domain/harness-event";
import { and, asc, eq, gt, or } from "drizzle-orm";
import { Effect, Option } from "effect";
import {
  advance,
  markFor,
  type RunTail,
  type TailEvent,
  type TailMark,
} from "../domain/tail";
import { tryStore } from "./query";

export interface RunTailInput {
  readonly after: readonly TailMark[];
  readonly organizationId: string;
  readonly runId: string;
}

export const runTailQuery = Effect.gen(function* () {
  const db = yield* Database;

  const readTail = (input: RunTailInput) =>
    Effect.gen(function* () {
      const trials = yield* tryStore("runQuery.tailTrials", () =>
        db
          .select({
            cell: evalCell.internalId,
            ordinal: evalTrial.ordinal,
            status: evalRun.status,
            trial: evalTrial.internalId,
            trialStatus: evalTrial.status,
          })
          .from(evalRun)
          .leftJoin(evalCell, eq(evalCell.runInternalId, evalRun.internalId))
          .leftJoin(
            evalTrial,
            eq(evalTrial.cellInternalId, evalCell.internalId)
          )
          .where(
            and(
              eq(evalRun.id, input.runId),
              eq(evalRun.organizationId, input.organizationId)
            )
          )
      );

      const [first] = trials;

      if (first === undefined) {
        return Option.none<RunTail>();
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
          row.cell === null || row.ordinal === null || row.trial === null
            ? []
            : [[row.trial, { cell: row.cell, ordinal: row.ordinal }] as const]
        )
      );

      if (addressed.size === 0) {
        return Option.some<RunTail>({
          events: [],
          next: input.after,
          running,
          settled,
        });
      }

      const rows = yield* tryStore("runQuery.tailEvents", () =>
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

      return Option.some<RunTail>({
        events,
        next: advance(input.after, events),
        running,
        settled,
      });
    }).pipe(Effect.withSpan("RunQuery.readTail"));

  return { readTail };
});
