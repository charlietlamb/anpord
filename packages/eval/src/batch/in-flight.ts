import { MAX_ORGANIZATION_RUNS_IN_FLIGHT } from "@sphynx/schema/domain/eval-quota";
import { Effect } from "effect";
import { StartRefused } from "../domain/errors";
import { BatchRepository } from "../repositories/batch-repository";

export const tooBusy = (inFlight: number) =>
  new StartRefused({
    reason: `This organization already has ${inFlight} batches going, and may have ${MAX_ORGANIZATION_RUNS_IN_FLIGHT} at once. Wait for one to finish.`,
    retryable: true,
  });

export const refuseWhenBusy = (organizationId: string) =>
  Effect.gen(function* () {
    const inFlight = yield* (yield* BatchRepository)
      .inFlight(organizationId)
      .pipe(Effect.orDie);

    if (inFlight >= MAX_ORGANIZATION_RUNS_IN_FLIGHT) {
      return yield* tooBusy(inFlight);
    }
  });
