import { AutumnService } from "@anpord/billing/autumn";
import type { OrganizationId } from "@anpord/schema/domain/actor";
import { Effect } from "effect";

/* Forked and never gated: usage that cannot be counted is reconciled later, not a reason to fail a run the customer was told started. The real spend bound is the trial cap and in-flight limit in start-admission.ts. */
export const meterRun = (input: {
  readonly organizationId: OrganizationId;
  readonly runId: string;
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
        orgId: input.organizationId,
        runId: input.runId,
      })
    )
  );
