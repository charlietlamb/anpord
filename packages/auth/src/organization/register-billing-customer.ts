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
  organization: { readonly id: string; readonly name: string | null },
  /* The person who created it, so an account is reachable in the billing
     console without joining back to our own tables. */
  email: string | null
) =>
  autumn
    .call("Autumn.register", (client) =>
      client.customers.getOrCreate({
        customerId: organization.id,
        email,
        name: organization.name,
      })
    )
    .pipe(
      Effect.annotateLogs({ orgId: organization.id }),
      Effect.catchAll((error) =>
        Effect.logError("could not register the billing customer", error)
      )
    );
