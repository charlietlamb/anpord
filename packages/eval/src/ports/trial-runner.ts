import { Context, Effect, Layer } from "effect";

interface GridDispatch {
  readonly organizationId: string;
  readonly runId: string;
  /** What to run, for a runner that stays in this process.
   *
   * A runner that does not is given the ids above and rebuilds the grid
   * itself, resolving credentials where they are stored. Trigger.dev's own
   * guidance is the same: payloads are logged, so they carry identifiers and
   * never secrets. */
  readonly work: Effect.Effect<void>;
}

export interface TrialRunnerShape {
  readonly dispatch: (input: GridDispatch) => Effect.Effect<void>;
}

export class TrialRunner extends Context.Tag("@anpord/eval/TrialRunner")<
  TrialRunner,
  TrialRunnerShape
>() {}

/**
 * Runs the grid here, in a fiber nothing is waiting on.
 *
 * The default, and what a worker uses once something else has handed it the
 * run: a process that dies mid-run takes the run with it, which is the whole
 * reason the port exists.
 */
export const TrialRunnerInProcess = Layer.succeed(
  TrialRunner,
  TrialRunner.of({
    dispatch: ({ runId, work }) =>
      Effect.forkDaemon(work.pipe(Effect.annotateLogs({ runId }))).pipe(
        Effect.asVoid
      ),
  })
);
