import { Activity, Workflow } from "@effect/workflow";
import { Clock, Effect, Schedule, Schema } from "effect";
import { ProviderName } from "../domain/cell";
import { SandboxUnavailable } from "../domain/errors";
import { TrialOutcome } from "../domain/trial";
import { TrialRepository } from "../repositories/trial-repository";
import { TrialRunner } from "../services/trial-runner";

const TrialPayload = {
  autoStopMinutes: Schema.Int,
  files: Schema.Record({ key: Schema.String, value: Schema.String }),
  provider: ProviderName,
  setupCommand: Schema.NullOr(Schema.String),
  trialInternalId: Schema.String,
  verifyCommand: Schema.String,
  workspace: Schema.String,
};

export const TrialWorkflow = Workflow.make({
  error: SandboxUnavailable,
  /* The trial id is the unit of deduplication. A trial costs real money, so a
     retried submit must not buy a second sandbox. */
  idempotencyKey: ({ trialInternalId }) => trialInternalId,
  name: "Trial",
  payload: TrialPayload,
  success: TrialOutcome,
});

export const TrialWorkflowLive = TrialWorkflow.toLayer(
  Effect.fn(function* (payload) {
    const runner = yield* TrialRunner;
    const trials = yield* TrialRepository;

    return yield* Activity.make({
      error: SandboxUnavailable,
      /* Every activity is wrapped in an undocumented retryOnInterrupt that
         retries ten times. An interrupted trial is the expensive failure, and
         re-running one silently would also invent trials that never happened,
         so this one opts out and records its attempt instead. */
      interruptRetryPolicy: Schedule.stop,
      name: "RunTrial",
      success: TrialOutcome,
      execute: Effect.gen(function* () {
        const attempt = yield* Activity.CurrentAttempt;

        const result = yield* runner.run({
          autoStopMinutes: payload.autoStopMinutes,
          files: payload.files,
          provider: payload.provider,
          setupCommand: payload.setupCommand,
          verifyCommand: payload.verifyCommand,
          workspace: payload.workspace,
        });

        const finishedAt = yield* Clock.currentTimeMillis;

        yield* trials
          .settle({
            attempt,
            finishedAt: new Date(finishedAt),
            internalId: payload.trialInternalId,
            outcome: result.outcome,
          })
          .pipe(Effect.orDie);

        return result.outcome;
      }),
    }).pipe(
      Effect.withSpan("TrialWorkflow.run", {
        attributes: { provider: payload.provider },
      })
    );
  })
);
