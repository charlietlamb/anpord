import { AutumnService } from "@anpord/billing/autumn";
import type { OrganizationId } from "@anpord/schema/domain/actor";
import { Effect } from "effect";

export const meterBatch = (input: {
  readonly batchId: string;
  readonly organizationId: OrganizationId;
  readonly trials: number;
}) =>
  Effect.forkDaemon(
    Effect.flatMap(AutumnService, (autumn) =>
      autumn.call("Autumn.track", (client) =>
        client.track({
          customerId: input.organizationId,
          featureId: "evals",
          value: input.trials,
        })
      )
    ).pipe(
      Effect.catchAll((error) =>
        Effect.logError("could not record eval usage", error)
      ),
      Effect.annotateLogs({
        batchId: input.batchId,
        orgId: input.organizationId,
      })
    )
  );
