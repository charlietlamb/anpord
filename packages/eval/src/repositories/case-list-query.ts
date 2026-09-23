import { Database } from "@anpord/db/client";
import { evalCaseVersion } from "@anpord/db/schema/evals/eval-case-versions";
import { evalCase } from "@anpord/db/schema/evals/eval-cases";
import { evalCell } from "@anpord/db/schema/evals/eval-cells";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
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
        .innerJoin(
          evalCaseVersion,
          eq(evalCaseVersion.caseInternalId, evalCase.internalId)
        )
        .innerJoin(
          evalCell,
          eq(evalCell.caseVersionInternalId, evalCaseVersion.internalId)
        )
        .where(
          and(
            eq(evalCase.organizationId, input.organizationId),
            input.tag === null
              ? undefined
              : sql`exists (select 1 from ${evalCaseVersion} tagged where tagged.case_internal_id = ${evalCase.internalId} and tagged.tags @> ${JSON.stringify([input.tag])}::jsonb)`
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
        .selectDistinctOn([evalCaseVersion.caseInternalId], {
          caseInternalId: evalCaseVersion.caseInternalId,
          cellInternalId: evalCell.internalId,
          cellKey: evalCell.cellKey,
          harness: evalCell.harness,
          model: evalCell.model,
          runId: evalRun.id,
          tags: evalCaseVersion.tags,
        })
        .from(evalCell)
        .innerJoin(
          evalCaseVersion,
          eq(evalCaseVersion.internalId, evalCell.caseVersionInternalId)
        )
        .innerJoin(evalRun, eq(evalRun.internalId, evalCell.runInternalId))
        .where(inArray(evalCaseVersion.caseInternalId, [...caseInternalIds]))
        .orderBy(evalCaseVersion.caseInternalId, desc(evalCell.createdAt))
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
        .selectDistinct({ tags: evalCaseVersion.tags })
        .from(evalCaseVersion)
        .where(eq(evalCaseVersion.organizationId, organizationId))
    ).pipe(
      Effect.map((rows) =>
        [...new Set(rows.flatMap((row) => row.tags ?? []))].sort()
      ),
      Effect.withSpan("RunQuery.listTags")
    );

  return { listCases, listTags };
});
