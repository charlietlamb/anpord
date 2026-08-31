import { Effect, Layer } from "effect";
import { TrialRunner } from "../ports/trial-runner";

export const TrialRunnerInProcess = Layer.succeed(
  TrialRunner,
  TrialRunner.of({
    dispatch: ({ run, runId }) =>
      Effect.forkDaemon(run.pipe(Effect.annotateLogs({ runId }))).pipe(
        Effect.asVoid
      ),
  })
);
