import { configure, tasks } from "@trigger.dev/sdk";
import { Config, Effect, Layer, Redacted } from "effect";
import { TrialRunner } from "../../ports/trial-runner";

/** The task id the worker registers. A string rather than an import, because
 * this package cannot see the worker that defines it. */
const EVAL_RUN = "eval-run";

/* Read here rather than left to the sdk's own lookup, so a deployment missing
   it fails while the layer is built rather than on the first run somebody
   starts. TRIGGER_API_KEY is accepted too, being what this project's
   environments already call it. */
const secretKey = Config.redacted("TRIGGER_SECRET_KEY").pipe(
  Config.orElse(() => Config.redacted("TRIGGER_API_KEY"))
);

/**
 * Hands a run to a worker rather than to a fiber in this process.
 *
 * The work the port carries is deliberately dropped: it closes over this
 * process's services, and the point of dispatching is that another process
 * picks the run up. The worker rebuilds it from the ids, which is also why
 * nothing secret is sent -- payloads are recorded and shown in a dashboard.
 */
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
          /* Dies rather than propagates: dispatch returns void to a caller that
           has already recorded the run, so there is nothing it could do with
           the failure. The run stays running and the sweep marks it
           resumable, which is the state a resume is for. */
          Effect.orDie,
          Effect.asVoid,
          Effect.withSpan("TrialRunner.dispatch", { attributes: { runId } }),
          Effect.annotateLogs({ organizationId, runId })
        ),
    });
  })
);
