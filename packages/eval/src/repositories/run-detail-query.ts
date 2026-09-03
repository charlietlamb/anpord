import { Database } from "@anpord/db/client";
import { evalCell } from "@anpord/db/schema/evals/eval-cells";
import { evalHarnessProfile } from "@anpord/db/schema/evals/eval-harness-profiles";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { evalTask } from "@anpord/db/schema/evals/eval-tasks";
import { evalTrialCost } from "@anpord/db/schema/evals/eval-trial-costs";
import { and, eq, inArray } from "drizzle-orm";
import { Effect, Option } from "effect";
import { cellTrialsQuery } from "./cell-trials-query";
import { head, tryStore } from "./query";
import { detailOf, groupCosts, type RunDetail } from "./run-detail";
import { groupByCell } from "./trial-distribution";

type RunRow = typeof evalRun.$inferSelect;
type CostRow = typeof evalTrialCost.$inferSelect;

export const runDetailQuery = Effect.gen(function* () {
  const db = yield* Database;
  const trialsForCells = yield* cellTrialsQuery;

  const costsForTrials = (trialIds: readonly string[]) =>
    trialIds.length === 0
      ? Effect.succeed([] as readonly CostRow[])
      : tryStore("runQuery.trialCosts", () =>
          db
            .select()
            .from(evalTrialCost)
            .where(inArray(evalTrialCost.trialInternalId, [...trialIds]))
        );

  const hydrateRuns = (runs: readonly RunRow[]) =>
    Effect.gen(function* () {
      if (runs.length === 0) {
        return [];
      }

      const cells = yield* tryStore("runQuery.cells", () =>
        db
          .select({
            caseName: evalTask.name,
            cell: evalCell,
            prompt: evalCell.prompt,
            repoRef: evalTask.repoRef,
            repoUrl: evalTask.repoUrl,
            prepareName: evalTask.prepareName,
            prepareSource: evalTask.prepareSource,
            profile: evalHarnessProfile,
            validatorName: evalTask.validatorName,
            verifyCommand: evalTask.verifyCommand,
            workspace: evalTask.workspace,
          })
          .from(evalCell)
          .innerJoin(evalTask, eq(evalCell.taskInternalId, evalTask.internalId))
          .leftJoin(
            evalHarnessProfile,
            eq(evalCell.profileInternalId, evalHarnessProfile.internalId)
          )
          .where(
            inArray(
              evalCell.runInternalId,
              runs.map((run) => run.internalId)
            )
          )
      );

      const trials = yield* trialsForCells(
        cells.map((row) => row.cell.internalId)
      );
      const costs = yield* costsForTrials(
        trials.map((trial) => trial.internalId)
      );
      const cellsByRun = Map.groupBy(cells, (row) => row.cell.runInternalId);
      const trialsByCell = groupByCell(trials);
      const costsByTrial = groupCosts(costs);

      return runs.map((run) =>
        detailOf(
          run,
          cellsByRun.get(run.internalId) ?? [],
          trialsByCell,
          costsByTrial
        )
      );
    }).pipe(Effect.withSpan("RunQuery.hydrateRuns"));

  const findRun = (organizationId: string, runId: string) =>
    Effect.gen(function* () {
      const { cells, found } = yield* Effect.all(
        {
          cells: tryStore("runQuery.cells", () =>
            db
              .select({
                caseName: evalTask.name,
                cell: evalCell,
                prompt: evalCell.prompt,
                repoRef: evalTask.repoRef,
                repoUrl: evalTask.repoUrl,
                prepareName: evalTask.prepareName,
                profile: evalHarnessProfile,
                validatorName: evalTask.validatorName,
                verifyCommand: evalTask.verifyCommand,
                workspace: evalTask.workspace,
              })
              .from(evalCell)
              .innerJoin(
                evalTask,
                eq(evalCell.taskInternalId, evalTask.internalId)
              )
              .innerJoin(
                evalRun,
                eq(evalCell.runInternalId, evalRun.internalId)
              )
              .leftJoin(
                evalHarnessProfile,
                eq(evalCell.profileInternalId, evalHarnessProfile.internalId)
              )
              .where(
                and(
                  eq(evalRun.organizationId, organizationId),
                  eq(evalRun.id, runId)
                )
              )
          ),
          found: tryStore("runQuery.findRun", () =>
            db
              .select()
              .from(evalRun)
              .where(
                and(
                  eq(evalRun.organizationId, organizationId),
                  eq(evalRun.id, runId)
                )
              )
          ).pipe(Effect.map(head)),
        },
        { concurrency: "unbounded" }
      );

      if (Option.isNone(found)) {
        return Option.none<RunDetail>();
      }

      const trials = yield* trialsForCells(
        cells.map((row) => row.cell.internalId)
      );

      const costs = yield* costsForTrials(
        trials.map((trial) => trial.internalId)
      );

      return Option.some(
        detailOf(found.value, cells, groupByCell(trials), groupCosts(costs))
      );
    }).pipe(Effect.withSpan("RunQuery.findRun"));

  return { findRun, hydrateRuns };
});
