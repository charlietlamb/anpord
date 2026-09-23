import { Database } from "@anpord/db/client";
import { evalCase } from "@anpord/db/schema/evals/eval-cases";
import { evalCell } from "@anpord/db/schema/evals/eval-cells";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { evalTask } from "@anpord/db/schema/evals/eval-tasks";
import type { EvalTask } from "@anpord/schema/domain/evals";
import { and, desc, eq } from "drizzle-orm";
import { Effect, Option } from "effect";
import { CellKey } from "../domain/cell";
import { namesOf } from "../domain/stored-cell";
import { head, tryStore } from "./query";

export interface CaseDetail {
  readonly cellKey: CellKey;
  readonly lastRunId: string;
  readonly name: string;
  readonly suite: string | null;
  readonly tags: readonly string[];
  readonly task: EvalTask;
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
          harnessVersion: evalCell.harnessVersion,
          lastRunId: evalRun.id,
          model: evalCell.model,
          name: evalCase.name,
          provider: evalCell.provider,
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
      Effect.map((rows) =>
        Option.flatMap(head(rows), (row) =>
          Option.map(
            namesOf(row),
            ({ harness, provider }): CaseDetail => ({
              cellKey: CellKey.make(row.cellKey),
              lastRunId: row.lastRunId,
              name: row.name,
              suite: row.suite,
              tags: row.tags ?? [],
              task: {
                harness,
                harnessVersion: row.harnessVersion,
                model: row.model,
                sandbox: provider,
              },
            })
          )
        )
      ),
      Effect.withSpan("RunQuery.findCase")
    );

  return { findCase };
});
