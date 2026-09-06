import { RunQuery } from "@anpord/eval/repositories/run-query";
import { BadRequest, Conflict } from "@anpord/schema/domain/errors";
import {
  MAX_ORGANIZATION_RUNS_IN_FLIGHT,
  MAX_RUN_TRIALS,
  type StartSize,
  trialsRequested,
} from "@anpord/schema/domain/eval-quota";
import { Effect } from "effect";
import { type KeyedTask, tasksAreDistinct } from "./task-keys";

interface StartPayload {
  readonly cases: readonly unknown[];
  readonly tasks: readonly KeyedTask[];
  readonly trials: number;
}

const sizeOf = (payload: StartPayload): StartSize => ({
  cases: payload.cases.length,
  tasks: payload.tasks.length,
  trials: payload.trials,
});

/* Runs before `grid.start`, so a refusal has opened no VM and written no run row. The in-flight count is read rather than reserved: two racing starts can both be admitted, which is cheaper than serialising every start to bound an overshoot of one. */
export const admitStart = (
  organizationId: string,
  payload: StartPayload
): Effect.Effect<void, BadRequest | Conflict, RunQuery> =>
  Effect.gen(function* () {
    if (!tasksAreDistinct(payload.tasks)) {
      return yield* Effect.fail(
        new BadRequest({ message: "Each eval task must be unique" })
      );
    }

    const requested = trialsRequested(sizeOf(payload));

    if (requested > MAX_RUN_TRIALS) {
      return yield* Effect.fail(
        new BadRequest({
          message: `A run may contain at most ${MAX_RUN_TRIALS} trials, and this one asks for ${requested}`,
        })
      );
    }

    const runs = yield* RunQuery;
    const inFlight = yield* runs
      .countRunning(organizationId)
      .pipe(Effect.catchTag("EvalStoreError", Effect.die));

    if (inFlight >= MAX_ORGANIZATION_RUNS_IN_FLIGHT) {
      return yield* Effect.fail(
        new Conflict({
          message: `This organization already has ${inFlight} eval runs going, and may have ${MAX_ORGANIZATION_RUNS_IN_FLIGHT} at once. Wait for one to finish.`,
        })
      );
    }
  }).pipe(
    Effect.withSpan("StartAdmission.admit", {
      attributes: {
        cases: payload.cases.length,
        tasks: payload.tasks.length,
        trials: payload.trials,
      },
    })
  );
