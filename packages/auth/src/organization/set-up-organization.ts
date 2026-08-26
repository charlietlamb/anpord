import type { AutumnShape } from "@anpord/billing/autumn";
import type { Database } from "@anpord/db/client";
import type { IdGeneratorShape } from "@anpord/ids/id";
import { Clock, Effect } from "effect";
import { insertDefaultChannel } from "./organization-queries";

interface NewOrganization {
  readonly email: string | null;
  readonly id: string;
  readonly name: string | null;
}

/**
 * Everything a new organisation needs before anyone uses it.
 *
 * One function for both ways an organisation appears -- provisioned at first
 * sign-in, or created through Better Auth's plugin -- because the two had
 * drifted: both seeded the channel, only one registered for billing, so an
 * organisation's setup depended on which door it came through.
 *
 * Each step is logged rather than raised, and they run concurrently because
 * neither needs the other. An organisation missing its channel still resolves
 * prompts from the newest version, and one missing its billing customer is
 * registered on its first eval; failing the sign-in over either would be the
 * worse outcome.
 */
export const setUpOrganization = (
  db: Database["Type"],
  ids: IdGeneratorShape,
  autumn: AutumnShape,
  organization: NewOrganization
) =>
  Effect.all(
    [
      seedDefaultChannel(db, ids, organization.id),
      registerForBilling(autumn, organization),
    ],
    { concurrency: 2, discard: true }
  );

const seedDefaultChannel = (
  db: Database["Type"],
  ids: IdGeneratorShape,
  organizationId: string
) =>
  Effect.gen(function* () {
    const internalId = yield* ids.generate("channel");
    const createdAt = new Date(yield* Clock.currentTimeMillis);

    yield* insertDefaultChannel(db, { createdAt, internalId, organizationId });
  }).pipe(
    Effect.withSpan("Organization.seedDefaultChannel"),
    Effect.annotateLogs({ orgId: organizationId }),
    Effect.catchAll((error) =>
      Effect.logError("could not seed the default channel", error)
    )
  );

const registerForBilling = (
  autumn: AutumnShape,
  organization: NewOrganization
) =>
  autumn
    .call("Autumn.register", (client) =>
      client.customers.getOrCreate({
        customerId: organization.id,
        email: organization.email,
        name: organization.name,
      })
    )
    .pipe(
      Effect.annotateLogs({ orgId: organization.id }),
      Effect.catchAll((error) =>
        Effect.logError("could not register the billing customer", error)
      )
    );
