import { type Cause, Clock, Effect, Option } from "effect";
import { describeCause } from "../domain/failure";
import type { RunRepositoryShape } from "../repositories/run-repository";
import type { LiveRuns } from "./live-runs";

/* runCells settles a run once its cells report, but a failure before that
   leaves the row saying running with nobody left to correct it. */
export const settleFailedRun = (input: {
  readonly cause: Cause.Cause<unknown>;
  readonly created: { readonly id: string; readonly internalId: string };
  readonly live: LiveRuns;
  readonly runs: RunRepositoryShape;
}) =>
  Effect.gen(function* () {
    const finishedAt = yield* Clock.currentTimeMillis;
    const failure = describeCause(input.cause);

    yield* input.runs
      .finish({
        failure: `The run could not start: ${failure}`,
        finishedAt: new Date(finishedAt),
        internalId: input.created.internalId,
        status: "failed",
      })
      .pipe(Effect.ignoreLogged);

    yield* input.live.update(input.created.id, (state) => ({
      ...state,
      failure: Option.some(failure),
      finishedAt: Option.some(finishedAt),
      status: "failed",
    }));
  });
