import type { ReportedTrial } from "@anpord/schema/public/evals-api";
import { Clock, Effect, Option } from "effect";
import { RunQuery } from "../repositories/run-query";
import { RunRepository } from "../repositories/run-repository";
import { TrialRecorder } from "../repositories/trial-record";

export interface ReportTrial {
  readonly cellInternalId: string;
  readonly trial: ReportedTrial;
}

export interface FinishReported {
  readonly failed: boolean;
  readonly organizationId: string;
  readonly runId: string;
}

export const makeReportRun = Effect.gen(function* () {
  const query = yield* RunQuery;
  const recorder = yield* TrialRecorder;
  const runs = yield* RunRepository;

  const report = (input: ReportTrial) =>
    Effect.gen(function* () {
      const startedAt = new Date(yield* Clock.currentTimeMillis);

      const { trialInternalId } = yield* recorder.open({
        cellInternalId: input.cellInternalId,
        ordinal: input.trial.ordinal,
        provider: "local",
        startedAt,
      });

      yield* recorder.append({
        events: input.trial.events,
        from: 0,
        trialInternalId,
      });

      yield* recorder.settle({
        finishedAt: new Date(yield* Clock.currentTimeMillis),
        outcome: input.trial.outcome,
        prepared: {},
        sandboxId: input.trial.sandboxId ?? null,
        trialInternalId,
        usage: input.trial.usage ?? null,
      });
    }).pipe(Effect.withSpan("GridRun.report"));

  const finishReported = (input: FinishReported) =>
    query.findRun(input.organizationId, input.runId).pipe(
      Effect.flatMap(
        Option.match({
          onNone: () => Effect.succeed(false),
          onSome: (detail) =>
            Clock.currentTimeMillis.pipe(
              Effect.flatMap((now) =>
                runs.finish({
                  failure: null,
                  finishedAt: new Date(now),
                  internalId: detail.run.internalId,
                  status: input.failed ? "failed" : "finished",
                })
              ),
              Effect.as(true)
            ),
        })
      ),
      Effect.withSpan("GridRun.finishReported")
    );

  return { finishReported, report };
});
