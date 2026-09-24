import { Database } from "@anpord/db/client";
import { evalBatch } from "@anpord/db/schema/evals/eval-batches";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { evalVariant } from "@anpord/db/schema/evals/eval-variants";
import type {
  EvalBatch,
  EvalBatchPage,
  EvalPageCursor,
} from "@anpord/schema/domain/evals";
import { and, count, countDistinct, desc, eq, inArray, sql } from "drizzle-orm";
import { DateTime, Effect, Option } from "effect";
import { rollUp } from "../domain/eval-costs";
import { nextCursor, pageOf, pageSizeOf } from "../domain/page";
import { head, tryStore } from "./query";
import { runReadsQuery } from "./run-reads-query";
import { runStatus } from "./run-view";

const timestamp = (date: Date | null) =>
  date === null ? null : DateTime.unsafeMake(date.getTime());

export const batchReadsQuery = Effect.gen(function* () {
  const db = yield* Database;
  const runs = yield* runReadsQuery;

  const get = (organizationId: string, batchId: string) =>
    Effect.gen(function* () {
      const found = yield* tryStore("batchReads.get", () =>
        db
          .select()
          .from(evalBatch)
          .where(
            and(
              eq(evalBatch.organizationId, organizationId),
              eq(evalBatch.internalId, batchId)
            )
          )
      ).pipe(Effect.map(head));

      if (Option.isNone(found)) {
        return Option.none<EvalBatch>();
      }

      const batch = found.value;
      const held = yield* runs.find({
        events: true,
        organizationId,
        where: eq(evalRun.batchInternalId, batchId),
      });

      return Option.some<EvalBatch>({
        costs: rollUp(held.map((run) => run.costs)),
        failure: batch.failure,
        finishedAt: timestamp(batch.finishedAt),
        id: batch.internalId,
        local: batch.local,
        runs: held.toReversed(),
        startedAt: DateTime.unsafeMake(batch.createdAt.getTime()),
        status: runStatus(batch.status),
        trigger: batch.trigger,
      });
    }).pipe(Effect.withSpan("BatchReads.get", { attributes: { batchId } }));

  const list = (input: {
    readonly cursor: EvalPageCursor | null;
    readonly limit: number | undefined;
    readonly organizationId: string;
  }) =>
    Effect.gen(function* () {
      const size = pageSizeOf(input.limit);
      const scope = eq(evalBatch.organizationId, input.organizationId);

      const rows = yield* tryStore("batchReads.list", () =>
        db
          .select()
          .from(evalBatch)
          .where(
            and(
              scope,
              input.cursor === null
                ? undefined
                : sql`(${evalBatch.createdAt}, ${evalBatch.internalId}) < (${new Date(input.cursor.startedAtMillis)}, ${input.cursor.id})`
            )
          )
          .orderBy(desc(evalBatch.createdAt), desc(evalBatch.internalId))
          .limit(size + 1)
      );
      const page = pageOf(rows, size);
      const ids = page.items.map((row) => row.internalId);

      const tallies =
        ids.length === 0
          ? []
          : yield* tryStore("batchReads.tallies", () =>
              db
                .select({
                  batchInternalId: evalRun.batchInternalId,
                  cases: countDistinct(evalVariant.caseInternalId),
                  passed: sql<number>`count(${evalTrial.internalId}) filter (where ${evalTrial.status} = 'passed')`.mapWith(Number),
                  runs: countDistinct(evalRun.internalId),
                  scored: sql<number>`count(${evalTrial.internalId}) filter (where ${evalTrial.status} in ('passed', 'failed'))`.mapWith(Number),
                  voided: sql<number>`count(${evalTrial.internalId}) filter (where ${evalTrial.status} = 'void')`.mapWith(Number),
                })
                .from(evalRun)
                .innerJoin(evalVariant, eq(evalVariant.internalId, evalRun.variantInternalId))
                .leftJoin(evalTrial, eq(evalTrial.runInternalId, evalRun.internalId))
                .where(inArray(evalRun.batchInternalId, ids))
                .groupBy(evalRun.batchInternalId)
            );
      const [totals] = yield* tryStore("batchReads.total", () =>
        db.select({ total: count() }).from(evalBatch).where(scope)
      );
      const byBatch = new Map(tallies.map((row) => [row.batchInternalId, row]));

      return {
        batches: page.items.map((row) => {
          const tally = byBatch.get(row.internalId);
          return {
            cases: tally?.cases ?? 0,
            failure: row.failure,
            finishedAt: timestamp(row.finishedAt),
            id: row.internalId,
            passed: tally?.passed ?? 0,
            runs: tally?.runs ?? 0,
            scored: tally?.scored ?? 0,
            startedAt: DateTime.unsafeMake(row.createdAt.getTime()),
            status: runStatus(row.status),
            trigger: row.trigger,
            voided: tally?.voided ?? 0,
          };
        }),
        next: nextCursor(page, (last) => ({
          id: last.internalId,
          startedAtMillis: last.createdAt.getTime(),
        })),
        total: totals?.total ?? 0,
      } satisfies EvalBatchPage;
    }).pipe(Effect.withSpan("BatchReads.list"));

  return { get, list };
});
