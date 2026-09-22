import { Database } from "@anpord/db/client";
import { evalCase } from "@anpord/db/schema/evals/eval-cases";
import { evalCell } from "@anpord/db/schema/evals/eval-cells";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { evalTask } from "@anpord/db/schema/evals/eval-tasks";
import { and, desc, eq } from "drizzle-orm";
import { Effect, Option } from "effect";
import type { CellKey } from "../domain/cell";
import { head, tryStore } from "./query";

export interface CaseDetail {
  readonly cellKey: CellKey;
  readonly harness: string;
  readonly lastRunId: string;
  readonly model: string;
  readonly name: string;
  readonly suite: string | null;
  readonly tags: readonly string[];
}

export interface CaseDetailInput {
  readonly id: string;
  readonly organizationId: string;
}

export const caseDetailQuery = Effect.gen(function* () {
  const db = yield* Database;

  const findCase = (input: CaseDetailInput) =>
    tryStore("runQuery.findCase", () =>
      db
        .select({
          cellKey: evalCell.cellKey,
          harness: evalCell.harness,
          lastRunId: evalRun.id,
          model: evalCell.model,
          name: evalCase.name,
          suite: evalRun.name,
          tags: evalTask.tags,
        })
        .from(evalCase)
        .innerJoin(evalTask, eq(evalTask.caseInternalId, evalCase.internalId))
        .innerJoin(evalCell, eq(evalCell.taskInternalId, evalTask.internalId))
        .innerJoin(evalRun, eq(evalRun.internalId, evalCell.runInternalId))
        .where(
          and(
            eq(evalCase.id, input.id),
            eq(evalCase.organizationId, input.organizationId)
          )
        )
        .orderBy(desc(evalCell.createdAt))
        .limit(1)
    ).pipe(
      Effect.map(head),
      Effect.map(
        Option.map(
          (row): CaseDetail => ({
            cellKey: row.cellKey as CellKey,
            harness: row.harness,
            lastRunId: row.lastRunId,
            model: row.model,
            name: row.name,
            suite: row.suite,
            tags: row.tags ?? [],
          })
        )
      ),
      Effect.withSpan("RunQuery.findCase")
    );

  return { findCase };
});
