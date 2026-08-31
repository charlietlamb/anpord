import { Context, type Effect } from "effect";

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
