import type { Database } from "@anpord/db/client";
import type { IdGeneratorShape } from "@anpord/ids/id";
import { Clock, Effect } from "effect";
import { insertDefaultChannel } from "./organization-queries";

type Db = Database["Type"];

/**
 * Gives a new organisation the channel that answers requests naming none.
 *
 * A failure is logged rather than raised. An organisation without the channel
 * still resolves, by answering from its newest version, and failing the
 * creation over a seed would be the worse outcome.
 */
export const seedDefaultChannel = (
  db: Db,
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
