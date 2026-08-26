import type { Database } from "@anpord/db/client";
import type { IdGeneratorShape } from "@anpord/ids/id";
import { Clock, Effect, Random } from "effect";
import { authId } from "./auth-id";
import { displayName, slugify } from "./organization-naming";
import type { OwnerProfile } from "./organization-queries";
import {
  insertDefaultChannel,
  insertOrganization,
  insertOwnerMembership,
} from "./organization-queries";

const SLUG_DISAMBIGUATOR_MAX = 1_000_000;

export const provisionPersonalOrganization = (
  db: Database["Type"],
  ids: IdGeneratorShape,
  userId: string,
  profile: OwnerProfile
) =>
  Effect.gen(function* () {
    const name = displayName(profile.name, profile.email);
    /* Better Auth writes these two tables as well, so its generator defines
       their shape. The channel is ours alone and keeps its prefix. */
    const organizationId = yield* authId;
    const memberId = yield* authId;
    const channelId = yield* ids.generate("channel");
    const disambiguator = yield* Random.nextIntBetween(
      0,
      SLUG_DISAMBIGUATOR_MAX
    );
    const createdAt = new Date(yield* Clock.currentTimeMillis);

    yield* insertOrganization(db, {
      createdAt,
      id: organizationId,
      name: `${name}'s Org`,
      slug: `${slugify(name)}-${disambiguator}`,
    });

    yield* insertOwnerMembership(db, {
      createdAt,
      id: memberId,
      organizationId,
      userId,
    });

    yield* insertDefaultChannel(db, {
      createdAt,
      internalId: channelId,
      organizationId,
    });

    return organizationId;
  });
