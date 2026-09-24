import type { EvalTrigger } from "@anpord/schema/domain/eval-trigger";
import { Clock, Effect } from "effect";
import { describeFailure } from "../domain/errors";
import { TrialRunner } from "../ports/trial-runner";
import { BatchRepository, type NewRun } from "../repositories/batch-repository";

export interface Launch {
  readonly local: boolean;
  readonly organizationId: string;
  readonly runs: readonly NewRun[];
  readonly startedBy: string | null;
  readonly trigger: EvalTrigger | null;
}

export const makeLaunch = (
  execute: (batchInternalId: string) => Effect.Effect<unknown, unknown>
) =>
  Effect.gen(function* () {
    const batches = yield* BatchRepository;
    const runner = yield* TrialRunner;

    return (input: Launch) =>
      Effect.gen(function* () {
        const created = yield* batches.insert(input);

        if (!input.local) {
          yield* runner
            .dispatch({
              batchId: created.internalId,
              organizationId: input.organizationId,
              work: execute(created.internalId).pipe(Effect.ignoreLogged),
            })
            .pipe(
              Effect.tapErrorCause((cause) =>
                Clock.currentTimeMillis.pipe(
                  Effect.flatMap((finishedAt) =>
                    batches.finish({
                      failure: `The batch could not start: ${describeFailure(cause)}`,
                      finishedAt: new Date(finishedAt),
                      internalId: created.internalId,
                      status: "failed",
                    })
                  ),
                  Effect.ignoreLogged
                )
              )
            );
        }

        return created;
      }).pipe(
        Effect.withSpan("Batches.launch", {
          attributes: { local: input.local, runs: input.runs.length },
        }),
        Effect.annotateLogs({ organizationId: input.organizationId })
      );
  });
