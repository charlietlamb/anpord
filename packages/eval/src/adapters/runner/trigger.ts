import { configure, tasks } from "@trigger.dev/sdk";
import { Config, Effect, Layer, Redacted } from "effect";
import { TrialRunner } from "../../ports/trial-runner";

const EVAL_RUN = "eval-run";

const secretKey = Config.redacted("TRIGGER_SECRET_KEY").pipe(
  Config.orElse(() => Config.redacted("TRIGGER_API_KEY"))
);

export const TrialRunnerTrigger = Layer.effect(
  TrialRunner,
  Effect.gen(function* () {
    const key = yield* secretKey;

    configure({ secretKey: Redacted.value(key) });

    return TrialRunner.of({
      dispatch: ({ organizationId, runId }) =>
        Effect.tryPromise(() =>
          tasks.trigger(
            EVAL_RUN,
            { organizationId, runId },
            { tags: [`org_${organizationId}`, `run_${runId}`] }
          )
        ).pipe(
          Effect.tapErrorCause((cause) =>
            Effect.logError("could not hand the run to a worker", cause)
          ),
          Effect.orDie,
          Effect.asVoid,
          Effect.withSpan("TrialRunner.dispatch", { attributes: { runId } }),
          Effect.annotateLogs({ organizationId, runId })
        ),
    });
  })
);
