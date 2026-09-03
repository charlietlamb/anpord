import { Database } from "@anpord/db/client";
import { evalCell } from "@anpord/db/schema/evals/eval-cells";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { and, eq, exists, lt, notExists, sql } from "drizzle-orm";
import { Clock, Context, Duration, Effect, Layer, Schedule } from "effect";
import type { EvalStoreError } from "../domain/errors";
import { tryStore } from "../repositories/query";

interface Reconciled {
  readonly cells: number;
  readonly runs: number;
}

export interface ReconcilerShape {
  readonly sweep: (input: {
    readonly olderThan: Duration.Duration;
  }) => Effect.Effect<Reconciled, EvalStoreError>;
}

export class Reconciler extends Context.Tag("@anpord/eval/Reconciler")<
  Reconciler,
  ReconcilerShape
>() {}

export const ReconcilerLive = Layer.effect(
  Reconciler,
  Effect.gen(function* () {
    const db = yield* Database;

    const sweep = (input: { readonly olderThan: Duration.Duration }) =>
      Effect.gen(function* () {
        const now = yield* Clock.currentTimeMillis;
        const cutoff = new Date(now - Duration.toMillis(input.olderThan));
        const emptyCutoff = new Date(now - Duration.toMillis(EMPTY_AFTER));

        /* Trials first, for the same reason cells come before runs: a reader
           between two statements should never find a closed cell holding a
           trial that still claims to be running.

           Judged by the trial's own start, not the run's age: a resumed run
           is older than any cutoff, and its trials were started just now. A
           trial that never started is judged by when it was created.

           `void` rather than `failed`, because nothing decided these. The
           database agrees -- a status of `failed` requires a verdict to agree
           with, and an abandoned trial has none. */
        const abandoned = yield* tryStore("reconcile.trials", () =>
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
        );

        /* Judged by the age of the run rather than the cell's own, because a
           cell opened late in a long run is younger than the cutoff that
           closes the run above it. It was then left running under a run no
           later sweep looks at again, which is how a cell stayed running
           forever. */
        const cells = yield* tryStore("reconcile.cells", () =>
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
        );

        const stillborn = yield* tryStore("reconcile.stillborn", () =>
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
                lt(evalRun.createdAt, emptyCutoff),
                notExists(
                  db
                    .select({ one: sql`1` })
                    .from(evalCell)
                    .where(eq(evalCell.runInternalId, evalRun.internalId))
                )
              )
            )
            .returning({ internalId: evalRun.internalId })
        );

        /* Named as resumable rather than merely abandoned, because the cells
           are still on the run and a resume continues them. The sweep cannot
           do it itself: resolving a credential needs the actor whose it is,
           and a background pass acts for nobody. */
        const runs = yield* tryStore("reconcile.runs", () =>
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
        );

        if (
          runs.length > 0 ||
          cells.length > 0 ||
          stillborn.length > 0 ||
          abandoned.length > 0
        ) {
          yield* Effect.logWarning("closed abandoned eval work").pipe(
            Effect.annotateLogs({
              cells: cells.length,
              /* Named for what can be done about it rather than what was
                 done to it, and kept apart from the stillborn count, which
                 registered no cell and so has nothing to continue. */
              resumable: runs.length,
              stillborn: stillborn.length,
              trials: abandoned.length,
            })
          );
        }

        return {
          cells: cells.length,
          runs: runs.length + stillborn.length,
        };
      }).pipe(Effect.withSpan("Reconciler.sweep"));

    return Reconciler.of({ sweep });
  })
);

const EMPTY_AFTER = Duration.minutes(5);

const ABANDONED_AFTER = Duration.hours(6);
export const SWEEP_EVERY = Duration.minutes(30);

export const ReconcilerScheduleLive = Layer.scopedDiscard(
  Effect.gen(function* () {
    const reconciler = yield* Reconciler;

    yield* reconciler.sweep({ olderThan: ABANDONED_AFTER }).pipe(
      /* Every cause, not only the typed failure: a defect in one tick must
         not end the fiber and with it every later sweep. */
      Effect.catchAllCause((cause) =>
        Effect.logError("reconcile failed", cause)
      ),
      Effect.repeat(Schedule.spaced(SWEEP_EVERY)),
      Effect.forkScoped
    );
  })
);
