import { Context, type Effect } from "effect";

interface GridDispatch {
  readonly organizationId: string;
  readonly run: Effect.Effect<void>;
  readonly runId: string;
}

export interface TrialRunnerShape {
  readonly dispatch: (input: GridDispatch) => Effect.Effect<void>;
}

export class TrialRunner extends Context.Tag("@anpord/eval/TrialRunner")<
  TrialRunner,
  TrialRunnerShape
>() {}
