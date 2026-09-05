import { AutumnService } from "@anpord/billing/autumn";
import type { OrganizationId } from "@anpord/schema/domain/actor";
import { Effect } from "effect";

/**
 * Records what a started run will consume.
 *
 * Counted after the run is accepted, so a refused request is not billed, and
 * forked so a slow meter does not hold up the response. A failure to record is
 * logged and dropped: usage that cannot be counted is a billing problem to
 * reconcile, not a reason to fail a run the customer has already been told
 * started.
 *
 * This records; it does not gate. A pre-flight gate needs four things this
 * does not have, and each is a decision rather than a line of code:
 *
 *  1. `AutumnShape.call` returns `Effect<void>` -- it discards the SDK's
 *     answer, so no caller can read one. Reading a balance means the shape
 *     returning a value.
 *  2. That value is an SDK response crossing a process boundary, so it needs
 *     an `effect/Schema` decode rather than a cast, and a shape for the
 *     `allowed` and remaining-balance fields the check returns.
 *  3. Autumn offers `check({ requiredBalance, sendEvent: true })`, which gates
 *     and meters atomically -- the correct call, because a separate check and
 *     track let two concurrent starts both pass a check that only one balance
 *     covers.
 *  4. What happens when Autumn is unreachable. Failing closed refuses every
 *     run whenever the billing vendor is down; failing open is the overage
 *     this is meant to prevent. It is a product decision, and the deployment
 *     runs with no key configured at all -- `AutumnServiceLive` returns a
 *     no-op layer then -- so a gate must also say what an unbilled deployment
 *     means. Until that is settled, the trial cap and the in-flight run limit
 *     in `start-admission.ts` are the real bound on what a customer can spend,
 *     and they hold whether billing answers or not.
 */
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
