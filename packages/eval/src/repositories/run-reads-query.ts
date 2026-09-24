import { Database } from "@anpord/db/client";
import { evalBatch } from "@anpord/db/schema/evals/eval-batches";
import { evalCaseVersion } from "@anpord/db/schema/evals/eval-case-versions";
import { evalCase } from "@anpord/db/schema/evals/eval-cases";
import { evalHarnessProfile } from "@anpord/db/schema/evals/eval-harness-profiles";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { evalSuite } from "@anpord/db/schema/evals/eval-suites";
import { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { evalVariant } from "@anpord/db/schema/evals/eval-variants";
import { and, count, desc, eq, inArray, type SQL } from "drizzle-orm";
import { Effect, Option } from "effect";
import { EventRepository } from "./event-repository";
import { tryStore } from "./query";
import { type RunRow, runOf, trialOf } from "./run-view";
import { TrialCostRepository } from "./trial-cost-repository";

export interface RunsWhere {
  readonly events: boolean;
  readonly limit?: number;
  readonly offset?: number;
  readonly organizationId: string;
  readonly where: SQL | undefined;
}

const groupBy = <A>(rows: readonly A[], keyOf: (row: A) => string) => {
  const groups = new Map<string, A[]>();
  for (const row of rows) {
    const key = keyOf(row);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return groups;
};

export const runReadsQuery = Effect.gen(function* () {
  const db = yield* Database;
  const costs = yield* TrialCostRepository;
  const events = yield* EventRepository;

  const joined = () =>
    db
      .select({
        batch: evalBatch,
        case: { id: evalCase.id, name: evalCase.name },
        profile: evalHarnessProfile,
        run: evalRun,
        suite: { id: evalSuite.id, name: evalSuite.name },
        variant: evalVariant,
        version: evalCaseVersion,
      })
      .from(evalRun)
      .innerJoin(evalBatch, eq(evalBatch.internalId, evalRun.batchInternalId))
      .innerJoin(evalVariant, eq(evalVariant.internalId, evalRun.variantInternalId))
      .innerJoin(
        evalCaseVersion,
        eq(evalCaseVersion.internalId, evalRun.caseVersionInternalId)
      )
      .innerJoin(evalCase, eq(evalCase.internalId, evalVariant.caseInternalId))
      .innerJoin(evalSuite, eq(evalSuite.internalId, evalCase.suiteInternalId))
      .leftJoin(
        evalHarnessProfile,
        eq(evalHarnessProfile.internalId, evalRun.profileInternalId)
      );

  const scoped = (input: RunsWhere) =>
    and(eq(evalBatch.organizationId, input.organizationId), input.where);

  const hydrate = (rows: readonly RunRow[], withEvents: boolean) =>
    Effect.gen(function* () {
      const runIds = rows.map((row) => row.run.internalId);
      const trialRows =
        runIds.length === 0
          ? []
          : yield* tryStore("runReads.trials", () =>
              db
                .select()
                .from(evalTrial)
                .where(inArray(evalTrial.runInternalId, runIds))
            );
      const trialIds = trialRows.map((trial) => trial.internalId);
      const costRows = groupBy(
        yield* costs.forTrials(trialIds),
        (cost) => cost.trialInternalId
      );
      const journals = withEvents
        ? yield* events.listByTrials(trialIds)
        : new Map<string, never>();
      const trialsByRun = groupBy(trialRows, (trial) => trial.runInternalId);

      return rows.flatMap((row) =>
        Option.toArray(
          runOf(
            row,
            (trialsByRun.get(row.run.internalId) ?? []).map((trial) =>
              trialOf(
                trial,
                costRows.get(trial.internalId) ?? [],
                withEvents ? (journals.get(trial.internalId) ?? []) : undefined
              )
            )
          )
        )
      );
    });

  const find = (input: RunsWhere) =>
    Effect.gen(function* () {
      const rows = yield* tryStore("runReads.find", () => {
        const query = joined()
          .where(scoped(input))
          .orderBy(desc(evalRun.createdAt), desc(evalRun.internalId));
        const limited = input.limit === undefined ? query : query.limit(input.limit);
        return input.offset === undefined ? limited : limited.offset(input.offset);
      });
      return yield* hydrate(rows, input.events);
    }).pipe(Effect.withSpan("RunReads.find"));

  const total = (input: RunsWhere) =>
    tryStore("runReads.total", () =>
      db
        .select({ total: count() })
        .from(evalRun)
        .innerJoin(evalBatch, eq(evalBatch.internalId, evalRun.batchInternalId))
        .innerJoin(evalVariant, eq(evalVariant.internalId, evalRun.variantInternalId))
        .innerJoin(evalCase, eq(evalCase.internalId, evalVariant.caseInternalId))
        .where(scoped(input))
    ).pipe(Effect.map((rows) => rows[0]?.total ?? 0));

  return { find, total };
});
