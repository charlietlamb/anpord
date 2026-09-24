import { Context, Effect, Layer } from "effect";

interface BatchDispatch {
  readonly batchId: string;
  readonly organizationId: string;
  readonly work: Effect.Effect<void>;
}

export interface TrialRunnerShape {
  readonly dispatch: (input: BatchDispatch) => Effect.Effect<void>;
}

export class TrialRunner extends Context.Tag("@anpord/eval/TrialRunner")<
  TrialRunner,
  TrialRunnerShape
>() {}

export const TrialRunnerInProcess = Layer.succeed(
  TrialRunner,
  TrialRunner.of({
    dispatch: ({ batchId, work }) =>
      Effect.forkDaemon(work.pipe(Effect.annotateLogs({ batchId }))).pipe(
        Effect.asVoid
      ),
  })
);
