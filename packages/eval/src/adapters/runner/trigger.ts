import { batchTagOf } from "@anpord/schema/domain/eval-batch-subscription";
import { configure, tasks } from "@trigger.dev/sdk";
import { Config, Effect, Layer, Redacted } from "effect";
import { TrialRunner } from "../../ports/trial-runner";
import { EVAL_RUN, type EvalBatchPayload } from "./eval-run-task";

export const triggerSecretKey = Config.redacted("TRIGGER_SECRET_KEY").pipe(
  Config.orElse(() => Config.redacted("TRIGGER_API_KEY"))
);

export const TrialRunnerTrigger = Layer.effect(
  TrialRunner,
  Effect.gen(function* () {
    const key = yield* triggerSecretKey;

    configure({ secretKey: Redacted.value(key) });

    return TrialRunner.of({
      dispatch: ({ batchId, organizationId }) =>
        Effect.tryPromise(() =>
          tasks.trigger(
            EVAL_RUN,
            { batchId, organizationId } satisfies EvalBatchPayload,
            { tags: [`org_${organizationId}`, batchTagOf(batchId)] }
          )
        ).pipe(
          Effect.tapErrorCause((cause) =>
            Effect.logError("could not hand the run to a worker", cause)
          ),
          Effect.orDie,
          Effect.asVoid,
          Effect.withSpan("TrialRunner.dispatch", { attributes: { batchId } }),
          Effect.annotateLogs({ batchId, organizationId })
        ),
    });
  })
);
