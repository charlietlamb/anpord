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

/** Shared by both ways an organisation appears, so the two cannot drift. Steps
 * are logged rather than raised: neither is worth failing a sign-in over. */
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
