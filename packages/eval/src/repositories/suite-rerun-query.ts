import { Database } from "@anpord/db/client";
import { head } from "@anpord/db/query";
import { evalCase } from "@anpord/db/schema/evals/eval-cases";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { evalSuite } from "@anpord/db/schema/evals/eval-suites";
import { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { evalVariant } from "@anpord/db/schema/evals/eval-variants";
import type { EvalVariantResult } from "@anpord/schema/domain/eval-read-models";
import type { EvalSuite } from "@anpord/schema/domain/evals";
import { decodeTrialStatus } from "@anpord/schema/domain/trial";
import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { Effect, Option } from "effect";
import { distributionOf } from "../domain/distribution";
import type { RerunCandidate } from "../domain/rerun-plan";
import { type RunTemplate, templateOf } from "../domain/run-template";
import { tryStore } from "./query";
import { runStatus, timestamp, variantOf } from "./run-view";

export interface SuiteRerunCase {
  readonly candidate: RerunCandidate;
  readonly caseInternalId: string;
  readonly caseVersionInternalId: string | null;
  readonly templates: ReadonlyMap<string, RunTemplate>;
  readonly userModel: string | null;
}

export interface SuiteRerunRows {
  readonly cases: readonly SuiteRerunCase[];
  readonly suite: EvalSuite;
}

interface CaseRow {
  readonly id: string;
  readonly internalId: string;
  readonly name: string;
}

interface NewestRow {
  readonly run: typeof evalRun.$inferSelect;
  readonly variant: typeof evalVariant.$inferSelect;
}

const neverRan = (subject: CaseRow): SuiteRerunCase => ({
  candidate: { caseId: subject.id, caseName: subject.name, results: [] },
  caseInternalId: subject.internalId,
  caseVersionInternalId: null,
  templates: new Map(),
  userModel: null,
});

const newestOf = (rows: readonly NewestRow[]) =>
  rows.reduce<NewestRow | null>(
    (best, row) =>
      best === null || row.run.createdAt > best.run.createdAt ? row : best,
    null
  );

export const suiteRerunQuery = Effect.gen(function* () {
  const db = yield* Database;

  return (input: {
    readonly organizationId: string;
    readonly suiteId: string;
  }) =>
    Effect.gen(function* () {
      const found = yield* tryStore("suiteRerun.suite", () =>
        db
          .select({
            id: evalSuite.id,
            internalId: evalSuite.internalId,
            name: evalSuite.name,
          })
          .from(evalSuite)
          .where(
            and(
              eq(evalSuite.organizationId, input.organizationId),
              eq(evalSuite.id, input.suiteId)
            )
          )
          .limit(1)
      ).pipe(Effect.map(head));

      if (Option.isNone(found)) {
        return Option.none<SuiteRerunRows>();
      }

      const suite: EvalSuite = {
        id: found.value.id,
        name: found.value.name,
      };
      const cases = yield* tryStore("suiteRerun.cases", () =>
        db
          .select({
            id: evalCase.id,
            internalId: evalCase.internalId,
            name: evalCase.name,
          })
          .from(evalCase)
          .where(eq(evalCase.suiteInternalId, found.value.internalId))
          .orderBy(asc(evalCase.id))
      );

      if (cases.length === 0) {
        return Option.some<SuiteRerunRows>({ cases: [], suite });
      }

      const newest: readonly NewestRow[] = yield* tryStore(
        "suiteRerun.newest",
        () =>
          db
            .selectDistinctOn([evalRun.variantInternalId], {
              run: evalRun,
              variant: evalVariant,
            })
            .from(evalRun)
            .innerJoin(
              evalVariant,
              eq(evalVariant.internalId, evalRun.variantInternalId)
            )
            .where(
              inArray(
                evalVariant.caseInternalId,
                cases.map((subject) => subject.internalId)
              )
            )
            .orderBy(evalRun.variantInternalId, desc(evalRun.createdAt))
      );

      if (newest.length === 0) {
        return Option.some<SuiteRerunRows>({
          cases: cases.map(neverRan),
          suite,
        });
      }

      const trials = yield* tryStore("suiteRerun.trials", () =>
        db
          .select({
            commandCount: evalTrial.commandCount,
            runInternalId: evalTrial.runInternalId,
            status: evalTrial.status,
          })
          .from(evalTrial)
          .where(
            inArray(
              evalTrial.runInternalId,
              newest.map((row) => row.run.internalId)
            )
          )
      );
      const counts = yield* tryStore("suiteRerun.counts", () =>
        db
          .select({
            runs: count(),
            variantInternalId: evalRun.variantInternalId,
          })
          .from(evalRun)
          .where(
            inArray(
              evalRun.variantInternalId,
              newest.map((row) => row.variant.internalId)
            )
          )
          .groupBy(evalRun.variantInternalId)
      );
      const runsOf = new Map(
        counts.map((row) => [row.variantInternalId, row.runs])
      );

      const resultOf = (row: NewestRow): readonly EvalVariantResult[] =>
        Option.toArray(
          Option.map(variantOf(row.variant), (variant) => ({
            distribution: distributionOf(
              trials
                .filter((trial) => trial.runInternalId === row.run.internalId)
                .map((trial) => ({
                  commands: trial.commandCount ?? 0,
                  status: Option.getOrElse(
                    decodeTrialStatus(trial.status),
                    () => "void" as const
                  ),
                }))
            ),
            lastRunAt: timestamp(row.run.createdAt),
            lastRunId: row.run.internalId,
            runs: runsOf.get(row.variant.internalId) ?? 0,
            status: runStatus(row.run.status),
            variant,
          }))
        );

      return Option.some<SuiteRerunRows>({
        cases: cases.map((subject) => {
          const own = newest.filter(
            (row) => row.variant.caseInternalId === subject.internalId
          );
          const latest = newestOf(own);

          return {
            candidate: {
              caseId: subject.id,
              caseName: subject.name,
              results: own.flatMap(resultOf),
            },
            caseInternalId: subject.internalId,
            caseVersionInternalId: latest?.run.caseVersionInternalId ?? null,
            templates: new Map(
              own.flatMap((row) =>
                Option.toArray(
                  Option.map(
                    templateOf(row),
                    (template) =>
                      [template.variantInternalId, template] as const
                  )
                )
              )
            ),
            userModel: latest?.variant.userModel ?? null,
          };
        }),
        suite,
      });
    }).pipe(
      Effect.withSpan("SuiteRerunQuery.find", {
        attributes: { suiteId: input.suiteId },
      }),
      Effect.annotateLogs({ organizationId: input.organizationId })
    );
});
