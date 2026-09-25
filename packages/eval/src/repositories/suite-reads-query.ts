import { Database } from "@anpord/db/client";
import { evalCaseVersion } from "@anpord/db/schema/evals/eval-case-versions";
import { evalCase } from "@anpord/db/schema/evals/eval-cases";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { evalSuite } from "@anpord/db/schema/evals/eval-suites";
import { evalVariant } from "@anpord/db/schema/evals/eval-variants";
import {
  type EvalPageCursor,
  type EvalSuiteDetail,
  type EvalSuitePage,
  type EvalTally,
  tallyOf,
} from "@anpord/schema/domain/evals";
import type { SQL } from "drizzle-orm";
import { and, countDistinct, desc, eq, inArray, max, sql } from "drizzle-orm";
import { DateTime, Effect, Option } from "effect";
import { nextCursor, pageOf, pageSizeOf } from "../domain/page";
import { head, tryStore } from "./query";
import { variantResultsQuery } from "./variant-results-query";

export interface ListSuites {
  readonly cursor: EvalPageCursor | null;
  readonly limit: number | undefined;
  readonly organizationId: string;
}

interface SuiteCase {
  readonly internalId: string;
  readonly suiteInternalId: string;
}

const NOTHING_SCORED: EvalTally = { passed: 0, scored: 0 };

const lastRun = max(evalRun.createdAt);

const activity = sql<Date>`coalesce(${lastRun}, ${evalSuite.createdAt})`;

/* A variant row belongs to one case, so counting rows would report a two-case
   suite on two configurations as four. The configuration is what a definition
   calls a variant, so that is what the suite counts. */
const configurations =
  sql<number>`count(distinct (${evalVariant.harness}, ${evalVariant.model}, ${evalVariant.sandbox}, coalesce(${evalVariant.profile}, '')))`.mapWith(
    Number
  );

const timestamp = (at: Date | null) =>
  at === null ? null : DateTime.unsafeMake(at.getTime());

export const suiteReadsQuery = Effect.gen(function* () {
  const db = yield* Database;
  const variantResults = yield* variantResultsQuery;

  const facts = (organizationId: string, only?: SQL) =>
    db
      .select({
        cases: countDistinct(evalCase.internalId),
        createdAt: evalSuite.createdAt,
        id: evalSuite.id,
        internalId: evalSuite.internalId,
        lastRunAt: lastRun,
        name: evalSuite.name,
        prompt: evalSuite.prompt,
        source: evalSuite.source,
        variants: configurations,
      })
      .from(evalSuite)
      .leftJoin(evalCase, eq(evalCase.suiteInternalId, evalSuite.internalId))
      .leftJoin(
        evalVariant,
        eq(evalVariant.caseInternalId, evalCase.internalId)
      )
      .leftJoin(evalRun, eq(evalRun.variantInternalId, evalVariant.internalId))
      .where(and(eq(evalSuite.organizationId, organizationId), only))
      .groupBy(
        evalSuite.internalId,
        evalSuite.id,
        evalSuite.name,
        evalSuite.prompt,
        evalSuite.source,
        evalSuite.createdAt
      );

  const casesOf = (suiteInternalIds: readonly string[]) =>
    suiteInternalIds.length === 0
      ? Effect.succeed<readonly SuiteCase[]>([])
      : tryStore("suiteReads.cases", () =>
          db
            .select({
              internalId: evalCase.internalId,
              suiteInternalId: evalCase.suiteInternalId,
            })
            .from(evalCase)
            .where(inArray(evalCase.suiteInternalId, [...suiteInternalIds]))
        );

  const tallies = (suiteInternalIds: readonly string[]) =>
    Effect.gen(function* () {
      const cases = yield* casesOf(suiteInternalIds);
      const results = yield* variantResults(
        cases.map((subject) => subject.internalId)
      );

      const distributionsOf = (suiteInternalId: string) =>
        cases
          .filter((subject) => subject.suiteInternalId === suiteInternalId)
          .flatMap(
            (subject) =>
              results
                .get(subject.internalId)
                ?.map((entry) => entry.distribution) ?? []
          );

      return new Map(
        suiteInternalIds.map((suiteInternalId) => [
          suiteInternalId,
          tallyOf(distributionsOf(suiteInternalId)),
        ])
      );
    });

  const tagsOf = (suiteInternalId: string) =>
    tryStore("suiteReads.tags", () =>
      db
        .selectDistinct({ tags: evalCaseVersion.tags })
        .from(evalCaseVersion)
        .innerJoin(
          evalCase,
          eq(evalCase.internalId, evalCaseVersion.caseInternalId)
        )
        .where(eq(evalCase.suiteInternalId, suiteInternalId))
    ).pipe(
      Effect.map((rows) =>
        [...new Set(rows.flatMap((row) => row.tags))].toSorted()
      )
    );

  const list = (input: ListSuites) =>
    Effect.gen(function* () {
      const size = pageSizeOf(input.limit);

      const rows = yield* tryStore("suiteReads.list", () =>
        facts(input.organizationId)
          .having(
            input.cursor === null
              ? undefined
              : sql`(${activity}, ${evalSuite.id}) < (${new Date(input.cursor.startedAtMillis)}, ${input.cursor.id})`
          )
          .orderBy(desc(activity), desc(evalSuite.id))
          .limit(size + 1)
      );

      const page = pageOf(rows, size);
      const tallied = yield* tallies(page.items.map((row) => row.internalId));

      return {
        next: nextCursor(page, (last) => ({
          id: last.id,
          startedAtMillis: (last.lastRunAt ?? last.createdAt).getTime(),
        })),
        suites: page.items.map((row) => ({
          cases: row.cases,
          id: row.id,
          lastRunAt: timestamp(row.lastRunAt),
          name: row.name,
          tally: tallied.get(row.internalId) ?? NOTHING_SCORED,
          variants: row.variants,
        })),
      } satisfies EvalSuitePage;
    }).pipe(Effect.withSpan("SuiteReads.list"));

  const detail = (organizationId: string, suiteId: string) =>
    Effect.gen(function* () {
      const found = yield* tryStore("suiteReads.suite", () =>
        facts(organizationId, eq(evalSuite.id, suiteId))
      ).pipe(Effect.map(head));

      if (Option.isNone(found)) {
        return Option.none<EvalSuiteDetail>();
      }

      const row = found.value;
      const [tags, tallied] = yield* Effect.all(
        [tagsOf(row.internalId), tallies([row.internalId])],
        { concurrency: 2 }
      );

      return Option.some<EvalSuiteDetail>({
        cases: row.cases,
        id: row.id,
        lastRunAt: timestamp(row.lastRunAt),
        name: row.name,
        setup: { prompt: row.prompt, source: row.source },
        tags,
        tally: tallied.get(row.internalId) ?? NOTHING_SCORED,
        variants: row.variants,
      });
    }).pipe(Effect.withSpan("SuiteReads.detail"));

  return { detail, list };
});
