import { Database } from "@anpord/db/client";
import { user } from "@anpord/db/schema/auth/users";
import { evalCaseVersion } from "@anpord/db/schema/evals/eval-case-versions";
import { evalCase } from "@anpord/db/schema/evals/eval-cases";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { evalSuite } from "@anpord/db/schema/evals/eval-suites";
import { evalVariant } from "@anpord/db/schema/evals/eval-variants";
import type {
  EvalCaseDetail,
  EvalCasePage,
  EvalPageCursor,
} from "@anpord/schema/domain/evals";
import type { SQL } from "drizzle-orm";
import { and, asc, desc, eq, ilike, inArray, max, or, sql } from "drizzle-orm";
import { DateTime, Effect, Option } from "effect";
import { changesBetween } from "../domain/definition-changes";
import { nextCursor, pageOf, pageSizeOf } from "../domain/page";
import { head, tryStore } from "./query";
import { setupOf } from "./run-view";
import { variantResultsQuery } from "./variant-results-query";

type CaseSort = "recent" | "name";
type CaseOrder = "asc" | "desc";

export interface ListCases {
  readonly cursor: EvalPageCursor | null;
  readonly limit: number | undefined;
  readonly order: CaseOrder;
  readonly organizationId: string;
  readonly q: string | null;
  readonly sort: CaseSort;
  readonly suite: string | null;
  readonly tag: string | null;
}

/* `%` and `_` are LIKE wildcards, so searching "100%" would otherwise match
   everything starting with "100". */
const escapeLike = (term: string) =>
  term.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");

const matchesSearch = (term: string) => {
  const pattern = `%${escapeLike(term)}%`;

  return or(
    ilike(evalCase.id, pattern),
    ilike(evalCase.name, pattern),
    ilike(evalSuite.name, pattern)
  );
};

/* Each sort compares its whole ordering tuple at once, which is what stops
   rows sharing a sort key being skipped between pages. */
const afterCursor = (input: ListCases, lastRun: SQL<Date | null>) => {
  if (input.cursor === null) {
    return;
  }

  const after = input.order === "asc";

  if (input.sort === "name") {
    return after
      ? sql`(${evalCase.name}, ${evalCase.id}) > (${input.cursor.name ?? ""}, ${input.cursor.id})`
      : sql`(${evalCase.name}, ${evalCase.id}) < (${input.cursor.name ?? ""}, ${input.cursor.id})`;
  }

  const at = new Date(input.cursor.startedAtMillis);

  return after
    ? sql`(${lastRun}, ${evalCase.id}) > (${at}, ${input.cursor.id})`
    : sql`(${lastRun}, ${evalCase.id}) < (${at}, ${input.cursor.id})`;
};

const orderingOf = (input: ListCases, lastRun: SQL<Date | null>) => {
  const way = input.order === "asc" ? asc : desc;

  return input.sort === "name"
    ? [way(evalCase.name), way(evalCase.id)]
    : [way(lastRun), way(evalCase.id)];
};

const taggedWith = (tag: string) =>
  sql`exists (select 1 from ${evalCaseVersion} tagged where tagged.case_internal_id = ${evalCase.internalId} and tagged.tags @> ${JSON.stringify([tag])}::jsonb)`;

export const caseReadsQuery = Effect.gen(function* () {
  const db = yield* Database;
  const variantResults = yield* variantResultsQuery;

  const currentVersions = (caseInternalIds: readonly string[]) =>
    caseInternalIds.length === 0
      ? Effect.succeed(new Map<string, typeof evalCaseVersion.$inferSelect>())
      : tryStore("caseReads.currentVersions", () =>
          db
            .selectDistinctOn([evalCaseVersion.caseInternalId], {
              version: evalCaseVersion,
            })
            .from(evalRun)
            .innerJoin(
              evalCaseVersion,
              eq(evalCaseVersion.internalId, evalRun.caseVersionInternalId)
            )
            .where(
              inArray(evalCaseVersion.caseInternalId, [...caseInternalIds])
            )
            .orderBy(evalCaseVersion.caseInternalId, desc(evalRun.createdAt))
        ).pipe(
          Effect.map(
            (rows) =>
              new Map(
                rows.map((row) => [row.version.caseInternalId, row.version])
              )
          )
        );

  const suitesAndTags = (organizationId: string) =>
    Effect.all({
      suites: tryStore("caseReads.suites", () =>
        db
          .select({ id: evalSuite.id, name: evalSuite.name })
          .from(evalSuite)
          .where(eq(evalSuite.organizationId, organizationId))
          .orderBy(asc(evalSuite.name))
      ),
      tags: tryStore("caseReads.tags", () =>
        db
          .selectDistinct({ tags: evalCaseVersion.tags })
          .from(evalCaseVersion)
          .innerJoin(
            evalCase,
            eq(evalCase.internalId, evalCaseVersion.caseInternalId)
          )
          .where(eq(evalCase.organizationId, organizationId))
      ).pipe(
        Effect.map((rows) =>
          [...new Set(rows.flatMap((row) => row.tags))].toSorted()
        )
      ),
    });

  const list = (input: ListCases) =>
    Effect.gen(function* () {
      const size = pageSizeOf(input.limit);
      const lastRun = max(evalRun.createdAt);

      const rows = yield* tryStore("caseReads.list", () =>
        db
          .select({
            caseId: evalCase.id,
            internalId: evalCase.internalId,
            lastRunAt: lastRun,
            name: evalCase.name,
            suiteId: evalSuite.id,
            suiteName: evalSuite.name,
          })
          .from(evalCase)
          .innerJoin(
            evalSuite,
            eq(evalSuite.internalId, evalCase.suiteInternalId)
          )
          .innerJoin(
            evalVariant,
            eq(evalVariant.caseInternalId, evalCase.internalId)
          )
          .innerJoin(
            evalRun,
            eq(evalRun.variantInternalId, evalVariant.internalId)
          )
          .where(
            and(
              eq(evalCase.organizationId, input.organizationId),
              input.suite === null ? undefined : eq(evalSuite.id, input.suite),
              input.tag === null ? undefined : taggedWith(input.tag),
              input.q === null ? undefined : matchesSearch(input.q)
            )
          )
          .groupBy(
            evalCase.internalId,
            evalCase.id,
            evalCase.name,
            evalSuite.id,
            evalSuite.name
          )
          .having(afterCursor(input, lastRun))
          .orderBy(...orderingOf(input, lastRun))
          .limit(size + 1)
      );

      const page = pageOf(rows, size);
      const results = yield* variantResults(
        page.items.map((row) => row.internalId)
      );
      const current = yield* currentVersions(
        page.items.map((row) => row.internalId)
      );
      const filters = yield* suitesAndTags(input.organizationId);

      return {
        cases: page.items.map((row) => ({
          id: row.caseId,
          lastRunAt: DateTime.unsafeMake(
            new Date(row.lastRunAt ?? 0).getTime()
          ),
          name: row.name,
          suite: { id: row.suiteId, name: row.suiteName },
          tags: current.get(row.internalId)?.tags ?? [],
          variants: results.get(row.internalId) ?? [],
        })),
        next: nextCursor(page, (last) => ({
          id: last.caseId,
          name: last.name,
          startedAtMillis: new Date(last.lastRunAt ?? 0).getTime(),
        })),
        suites: filters.suites,
        tags: filters.tags,
      } satisfies EvalCasePage;
    }).pipe(Effect.withSpan("CaseReads.list"));

  const detail = (organizationId: string, caseId: string) =>
    Effect.gen(function* () {
      const found = yield* tryStore("caseReads.case", () =>
        db
          .select({
            case: evalCase,
            suite: { id: evalSuite.id, name: evalSuite.name },
          })
          .from(evalCase)
          .innerJoin(
            evalSuite,
            eq(evalSuite.internalId, evalCase.suiteInternalId)
          )
          .where(
            and(
              eq(evalCase.organizationId, organizationId),
              eq(evalCase.id, caseId)
            )
          )
      ).pipe(Effect.map(head));

      if (Option.isNone(found)) {
        return Option.none<EvalCaseDetail>();
      }

      const { case: subject, suite } = found.value;
      const versions = yield* tryStore("caseReads.versions", () =>
        db
          .select({ author: user.name, version: evalCaseVersion })
          .from(evalCaseVersion)
          .leftJoin(user, eq(user.id, evalCaseVersion.createdBy))
          .where(eq(evalCaseVersion.caseInternalId, subject.internalId))
          .orderBy(asc(evalCaseVersion.createdAt))
      );
      const newest =
        (yield* currentVersions([subject.internalId])).get(
          subject.internalId
        ) ?? versions.at(-1)?.version;

      if (newest === undefined) {
        return Option.none<EvalCaseDetail>();
      }

      const results = yield* variantResults([subject.internalId]);

      return Option.some<EvalCaseDetail>({
        id: subject.id,
        name: subject.name,
        setup: setupOf(newest),
        suite,
        tags: newest.tags,
        variants: results.get(subject.internalId) ?? [],
        versions: versions.map((row, index) => ({
          author: row.author,
          changes:
            index === 0
              ? []
              : changesBetween(
                  versions[index - 1]?.version ?? row.version,
                  row.version
                ),
          createdAt: DateTime.unsafeMake(row.version.createdAt.getTime()),
          definitionHash: row.version.definitionHash,
        })),
      });
    }).pipe(Effect.withSpan("CaseReads.detail"));

  return { detail, list };
});
