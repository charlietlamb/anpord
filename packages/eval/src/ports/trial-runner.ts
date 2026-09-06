import { Context, Effect, Layer } from "effect";

interface GridDispatch {
  readonly organizationId: string;
  readonly runId: string;
  /* In-process only. An out-of-process runner rebuilds the grid from the ids
     above, because payloads are logged and must carry no secrets. */
  readonly work: Effect.Effect<void>;
}

export interface TrialRunnerShape {
  readonly dispatch: (input: GridDispatch) => Effect.Effect<void>;
}

export class TrialRunner extends Context.Tag("@anpord/eval/TrialRunner")<
  TrialRunner,
  TrialRunnerShape
>() {}

/* A process that dies mid-run takes the run with it, which is why the port exists. */
export const TrialRunnerInProcess = Layer.succeed(
  TrialRunner,
  TrialRunner.of({
    dispatch: ({ runId, work }) =>
      Effect.forkDaemon(work.pipe(Effect.annotateLogs({ runId }))).pipe(
        Effect.asVoid
      ),
  })
);
