import { Context, type Effect } from "effect";
import type { ResumeGrid } from "../grid/run";

interface GridDispatch {
  /** The same work, as the ids a runner in another process would rebuild it
   * from. Carried so a worker never has to be handed a closure. */
  readonly grid: ResumeGrid;
  readonly organizationId: string;
  readonly runId: string;
  /** What to run, already built by the caller that owns the grid. */
  readonly work: Effect.Effect<void>;
}

export interface TrialRunnerShape {
  readonly dispatch: (input: GridDispatch) => Effect.Effect<void>;
}

export class TrialRunner extends Context.Tag("@anpord/eval/TrialRunner")<
  TrialRunner,
  TrialRunnerShape
>() {}
