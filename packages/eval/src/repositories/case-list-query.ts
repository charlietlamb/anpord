import { Database } from "@anpord/db/client";
import { evalCase } from "@anpord/db/schema/evals/eval-cases";
import { evalCell } from "@anpord/db/schema/evals/eval-cells";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { evalTask } from "@anpord/db/schema/evals/eval-tasks";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { Effect } from "effect";
import type { Distribution } from "../domain/distribution";
import { type PageCursor, pageOf } from "../domain/page";
import { cellTrialsQuery } from "./cell-trials-query";
import { tryStore } from "./query";
import { distributionFor, groupByCell } from "./trial-distribution";

export interface CaseSummary {
  readonly caseId: string;
  readonly cellKey: string;
  readonly distribution: Distribution;
  readonly harness: string;
  readonly lastRunAtMillis: number;
  readonly lastRunId: string;
  readonly model: string;
  readonly name: string;
  readonly runCount: number;
  readonly suite: string | null;
  readonly tags: readonly string[];
}

export interface ListCasesInput {
  readonly cursor: PageCursor | null;
  readonly limit: number;
  readonly organizationId: string;
  readonly tag: string | null;
}

export interface CasePageResult {
  readonly cases: readonly CaseSummary[];
  readonly next: PageCursor | null;
}

const lastRun = sql<Date>`date_trunc('milliseconds', max(${evalCell.createdAt}))`;

export const caseListQuery = Effect.gen(function* () {
  const db = yield* Database;
  const trialsForCells = yield* cellTrialsQuery;

  const casePage = (input: ListCasesInput) =>
    tryStore("runQuery.casePage", () =>
      db
        .select({
          caseId: evalCase.id,
          caseInternalId: evalCase.internalId,
          lastRunAt: lastRun,
          name: evalCase.name,
          runCount: sql<number>`count(*)::int`,
        })
        .from(evalCase)
        .innerJoin(evalTask, eq(evalTask.caseInternalId, evalCase.internalId))
        .innerJoin(evalCell, eq(evalCell.taskInternalId, evalTask.internalId))
        .where(
          and(
            eq(evalCase.organizationId, input.organizationId),
            input.tag === null
              ? undefined
              : sql`exists (select 1 from ${evalTask} tagged where tagged.case_internal_id = ${evalCase.internalId} and tagged.tags @> ${JSON.stringify([input.tag])}::jsonb)`
          )
        )
        .groupBy(evalCase.internalId, evalCase.id, evalCase.name)
        .having(
          input.cursor === null
            ? undefined
            : sql`(${lastRun}, ${evalCase.id}) < (${new Date(input.cursor.startedAtMillis)}, ${input.cursor.id})`
        )
        .orderBy(desc(lastRun), desc(evalCase.id))
        .limit(input.limit + 1)
    );

  const newestCells = (caseInternalIds: readonly string[]) =>
    tryStore("runQuery.caseNewestCells", () =>
      db
        .selectDistinctOn([evalTask.caseInternalId], {
          caseInternalId: evalTask.caseInternalId,
          cellInternalId: evalCell.internalId,
          cellKey: evalCell.cellKey,
          harness: evalCell.harness,
          model: evalCell.model,
          runId: evalRun.id,
          suite: evalRun.name,
          tags: evalTask.tags,
        })
        .from(evalCell)
        .innerJoin(evalTask, eq(evalTask.internalId, evalCell.taskInternalId))
        .innerJoin(evalRun, eq(evalRun.internalId, evalCell.runInternalId))
        .where(inArray(evalTask.caseInternalId, [...caseInternalIds]))
        .orderBy(evalTask.caseInternalId, desc(evalCell.createdAt))
    );

  const listCases = (input: ListCasesInput) =>
    Effect.gen(function* () {
      const { hasMore, items: page } = pageOf(
        yield* casePage(input),
        input.limit
      );
      const last = page.at(-1);

      if (page.length === 0) {
        return { cases: [], next: null } satisfies CasePageResult;
      }

      const newest = yield* newestCells(page.map((row) => row.caseInternalId));
      const byCase = new Map(newest.map((cell) => [cell.caseInternalId, cell]));
      const trials = groupByCell(
        yield* trialsForCells(newest.map((cell) => cell.cellInternalId))
      );

      const cases = page.flatMap((row): CaseSummary[] => {
        const cell = byCase.get(row.caseInternalId);

        return cell === undefined
          ? []
          : [
              {
                caseId: row.caseId,
                cellKey: cell.cellKey,
                distribution: distributionFor(
                  trials.get(cell.cellInternalId) ?? []
                ),
                harness: cell.harness,
                lastRunAtMillis: new Date(row.lastRunAt).getTime(),
                lastRunId: cell.runId,
                model: cell.model,
                name: row.name,
                runCount: row.runCount,
                suite: cell.suite,
                tags: cell.tags ?? [],
              },
            ];
      });

      return {
        cases,
        next:
          hasMore && last !== undefined
            ? {
                id: last.caseId,
                startedAtMillis: new Date(last.lastRunAt).getTime(),
              }
            : null,
      } satisfies CasePageResult;
    }).pipe(Effect.withSpan("RunQuery.listCases"));

  const listTags = (organizationId: string) =>
    tryStore("runQuery.listTags", () =>
      db
        .selectDistinct({ tags: evalTask.tags })
        .from(evalTask)
        .where(eq(evalTask.organizationId, organizationId))
    ).pipe(
      Effect.map((rows) =>
        [...new Set(rows.flatMap((row) => row.tags ?? []))].sort()
      ),
      Effect.withSpan("RunQuery.listTags")
    );

  return { listCases, listTags };
});
