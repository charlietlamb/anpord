import { Database } from "@anpord/db/client";
import { evalCell } from "@anpord/db/schema/evals/eval-cells";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { and, eq, lt, sql } from "drizzle-orm";
import { Clock, Context, Duration, Effect, Layer, Schedule } from "effect";
import type { EvalStoreError } from "../domain/errors";
import { tryStore } from "../repositories/query";

export interface Reconciled {
  readonly cells: number;
  readonly runs: number;
}

export interface ReconcilerShape {
  /** Closes runs whose process died.
   *
   * A run executes in a forked daemon, and a daemon does not survive SIGKILL:
   * its catch-all never fires, so the row stays running forever and every
   * later read reports work that stopped hours ago as still in flight.
   * Nothing else in the system can notice, because the only witness died. */
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

        /* Cells first, so a run is never closed while its cells still claim
           to be running: a reader between the two statements would see a
           finished run full of in-flight work. */
        const cells = yield* tryStore("reconcile.cells", () =>
          db
            .update(evalCell)
            .set({ status: "failed" })
            .where(
              and(
                eq(evalCell.status, "running"),
                lt(evalCell.createdAt, cutoff)
              )
            )
            .returning({ internalId: evalCell.internalId })
        );

        const runs = yield* tryStore("reconcile.runs", () =>
          db
            .update(evalRun)
            .set({
              failure: "abandoned: the process running this did not finish it",
              finishedAt: sql`now()`,
              status: "failed",
            })
            .where(
              and(eq(evalRun.status, "running"), lt(evalRun.createdAt, cutoff))
            )
            .returning({ internalId: evalRun.internalId })
        );

        if (runs.length > 0 || cells.length > 0) {
          yield* Effect.logWarning("closed abandoned eval work").pipe(
            Effect.annotateLogs({ cells: cells.length, runs: runs.length })
          );
        }

        return { cells: cells.length, runs: runs.length };
      }).pipe(Effect.withSpan("Reconciler.sweep"));

    return Reconciler.of({ sweep });
  })
);

/** How long a run may be silent before it is presumed dead. Generous, because
 * a grid of many cells legitimately takes a long time and closing a live run
 * would be worse than leaving a dead one open a while longer. */
const ABANDONED_AFTER = Duration.hours(6);
const SWEEP_EVERY = Duration.minutes(30);

/**
 * Runs the sweep for the life of the process, once at startup and then on a
 * schedule.
 *
 * Forked as a daemon and scoped to the layer, so it stops when the layer
 * closes rather than outliving it.
 */
export const ReconcilerScheduleLive = Layer.scopedDiscard(
  Effect.gen(function* () {
    const reconciler = yield* Reconciler;

    yield* reconciler.sweep({ olderThan: ABANDONED_AFTER }).pipe(
      Effect.catchAll((error) =>
        Effect.logError("reconcile failed").pipe(
          Effect.annotateLogs({ reason: String(error) })
        )
      ),
      Effect.repeat(Schedule.spaced(SWEEP_EVERY)),
      Effect.forkScoped
    );
  })
);
