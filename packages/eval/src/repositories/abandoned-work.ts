import { Database } from "@anpord/db/client";
import { evalCell } from "@anpord/db/schema/evals/eval-cells";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { and, eq, exists, lt, notExists, sql } from "drizzle-orm";
import { Context, Effect, Layer } from "effect";
import type { EvalStoreError } from "../domain/errors";
import { tryStore } from "./query";

/* Three tables in one repository because the sweep's ordering is one
   transaction of intent: trials close before cells, cells before runs. */
export interface AbandonedWorkShape {
  readonly failCellsUnderRunsSince: (
    cutoff: Date
  ) => Effect.Effect<number, EvalStoreError>;
  readonly failRunsSince: (
    cutoff: Date
  ) => Effect.Effect<number, EvalStoreError>;
  readonly failRunsWithoutCellsSince: (
    cutoff: Date
  ) => Effect.Effect<number, EvalStoreError>;
  readonly voidTrialsRunningSince: (
    cutoff: Date
  ) => Effect.Effect<number, EvalStoreError>;
}

export class AbandonedWork extends Context.Tag("@anpord/eval/AbandonedWork")<
  AbandonedWork,
  AbandonedWorkShape
>() {}

export const AbandonedWorkLive = Layer.effect(
  AbandonedWork,
  Effect.gen(function* () {
    const db = yield* Database;

    const counted = <A>(operation: string, run: () => Promise<readonly A[]>) =>
      tryStore(operation, run).pipe(Effect.map((rows) => rows.length));

    return AbandonedWork.of({
      /* Judged by the trial's own start: a resumed run is older than any
         cutoff while its trials are live.

         `void` rather than `failed`, because nothing decided these. The
         database agrees -- a status of `failed` requires a verdict to agree
         with, and an abandoned trial has none. */
      voidTrialsRunningSince: (cutoff) =>
        counted("reconcile.trials", () =>
          db
            .update(evalTrial)
            .set({ finishedAt: sql`now()`, status: "void" })
            .where(
              and(
                eq(evalTrial.status, "running"),
                lt(
                  sql`coalesce(${evalTrial.startedAt}, ${evalTrial.createdAt})`,
                  cutoff
                )
              )
            )
            .returning({ internalId: evalTrial.internalId })
        ),

      /* Judged by the age of the run rather than the cell's own, because a
         cell opened late in a long run is younger than the cutoff that
         closes the run above it. It was then left running under a run no
         later sweep looks at again, which is how a cell stayed running
         forever. */
      failCellsUnderRunsSince: (cutoff) =>
        counted("reconcile.cells", () =>
          db
            .update(evalCell)
            .set({ status: "failed" })
            .where(
              and(
                eq(evalCell.status, "running"),
                exists(
                  db
                    .select({ one: sql`1` })
                    .from(evalRun)
                    .where(
                      and(
                        eq(evalRun.internalId, evalCell.runInternalId),
                        lt(evalRun.createdAt, cutoff)
                      )
                    )
                )
              )
            )
            .returning({ internalId: evalCell.internalId })
        ),

      failRunsWithoutCellsSince: (cutoff) =>
        counted("reconcile.stillborn", () =>
          db
            .update(evalRun)
            .set({
              failure: "abandoned: the process running this did not start it",
              finishedAt: sql`now()`,
              status: "failed",
            })
            .where(
              and(
                eq(evalRun.status, "running"),
                lt(evalRun.createdAt, cutoff),
                notExists(
                  db
                    .select({ one: sql`1` })
                    .from(evalCell)
                    .where(eq(evalCell.runInternalId, evalRun.internalId))
                )
              )
            )
            .returning({ internalId: evalRun.internalId })
        ),

      /* Named as resumable rather than merely abandoned, because the cells
         are still on the run and a resume continues them. The sweep cannot
         do it itself: resolving a credential needs the actor whose it is,
         and a background pass acts for nobody. */
      failRunsSince: (cutoff) =>
        counted("reconcile.runs", () =>
          db
            .update(evalRun)
            .set({
              failure:
                "abandoned: the process running this did not finish it. It can be resumed.",
              finishedAt: sql`now()`,
              status: "failed",
            })
            .where(
              and(eq(evalRun.status, "running"), lt(evalRun.createdAt, cutoff))
            )
            .returning({ internalId: evalRun.internalId })
        ),
    });
  })
);
