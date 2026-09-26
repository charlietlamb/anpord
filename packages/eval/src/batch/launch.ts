import { Clock, Effect, Option } from "effect";
import { describeFailure } from "../domain/errors";
import { TrialRunner } from "../ports/trial-runner";
import {
  BatchRepository,
  type NewBatch,
} from "../repositories/batch-repository";

export type Launch = NewBatch;

export type Launched = Option.Option<{
  readonly internalId: string;
  readonly runInternalIds: readonly string[];
}>;

export const makeLaunch = (
  execute: (batchInternalId: string) => Effect.Effect<unknown, unknown>
) =>
  Effect.gen(function* () {
    const batches = yield* BatchRepository;
    const runner = yield* TrialRunner;

    return (input: Launch) =>
      Effect.gen(function* () {
        const inserted = yield* batches.insert(input);
        if (Option.isNone(inserted)) {
          return inserted;
        }
        const created = inserted.value;

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

        return inserted;
      }).pipe(
        Effect.withSpan("Batches.launch", {
          attributes: { local: input.local, runs: input.runs.length },
        }),
        Effect.annotateLogs({ organizationId: input.organizationId })
      );
  });
