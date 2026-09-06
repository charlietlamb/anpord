import { configure, tasks } from "@trigger.dev/sdk";
import { Config, Effect, Layer, Redacted } from "effect";
import { TrialRunner } from "../../ports/trial-runner";

/* A string rather than an import: this package cannot see the worker that defines it. */
const EVAL_RUN = "eval-run";

/* Read here, not left to the sdk's lookup, so a missing key fails at layer build.
   TRIGGER_API_KEY is accepted as this project's existing name for it. */
const secretKey = Config.redacted("TRIGGER_SECRET_KEY").pipe(
  Config.orElse(() => Config.redacted("TRIGGER_API_KEY"))
);

/* The port's `work` is deliberately dropped: it closes over this process's
   services. Payloads are shown in a dashboard, so they carry ids and no secrets. */
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
          /* Dies rather than propagates: the caller has already recorded the run,
           and the sweep will mark it resumable. */
          Effect.orDie,
          Effect.asVoid,
          Effect.withSpan("TrialRunner.dispatch", { attributes: { runId } }),
          Effect.annotateLogs({ organizationId, runId })
        ),
    });
  })
);
