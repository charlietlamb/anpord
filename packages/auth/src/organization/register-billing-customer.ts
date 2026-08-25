import type { AutumnShape } from "@anpord/billing/autumn";
import { Effect } from "effect";

/**
 * Gives a new organisation its plan.
 *
 * Logged rather than raised, as with the default channel: failing a signup
 * because billing was unreachable would be the worse outcome.
 */
export const registerBillingCustomer = (
  autumn: AutumnShape,
  organization: { readonly id: string; readonly name: string | null }
) =>
  autumn
    .call("Autumn.register", (client) =>
      client.customers.getOrCreate({
        customerId: organization.id,
        name: organization.name,
      })
    )
    .pipe(
      Effect.annotateLogs({ orgId: organization.id }),
      Effect.catchAll((error) =>
        Effect.logError("could not register the billing customer", error)
      )
    );
