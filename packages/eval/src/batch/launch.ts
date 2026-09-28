import { Clock, Effect } from "effect";
import { describeFailure } from "../domain/errors";
import { TrialRunner } from "../ports/trial-runner";
import {
  BatchRepository,
  type InsertedBatch,
  type NewBatch,
} from "../repositories/batch-repository";
import { tooBusy } from "./in-flight";

export type Launch = NewBatch;

export type Launched = InsertedBatch;

export const keyless = (launched: Launched) =>
  Effect.gen(function* () {
    if (launched.kind === "overLimit") {
      return yield* tooBusy(launched.inFlight);
    }
    if (launched.kind === "keyTaken") {
      return yield* Effect.dieMessage(
        "a re-run carries no idempotency key, so nothing could have taken one"
      );
    }
    return launched;
  });

export const makeLaunch = (
  execute: (batchInternalId: string) => Effect.Effect<unknown, unknown>
) =>
  Effect.gen(function* () {
    const batches = yield* BatchRepository;
    const runner = yield* TrialRunner;

    return (input: Launch) =>
      Effect.gen(function* () {
        const inserted = yield* batches.insert(input);
        if (inserted.kind !== "inserted") {
          return inserted;
        }

        if (!input.local) {
          yield* runner
            .dispatch({
              batchId: inserted.internalId,
              organizationId: input.organizationId,
              work: execute(inserted.internalId).pipe(Effect.ignoreLogged),
            })
            .pipe(
              Effect.tapErrorCause((cause) =>
                Clock.currentTimeMillis.pipe(
                  Effect.flatMap((finishedAt) =>
                    batches.finish({
                      failure: `The batch could not start: ${describeFailure(cause)}`,
                      finishedAt: new Date(finishedAt),
                      internalId: inserted.internalId,
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
