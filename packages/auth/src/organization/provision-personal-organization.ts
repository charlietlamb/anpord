import type { AutumnShape } from "@anpord/billing/autumn";
import type { Database } from "@anpord/db/client";
import type { IdGeneratorShape } from "@anpord/ids/id";
import { Clock, Effect, Random } from "effect";
import { authId } from "./auth-id";
import { displayName, slugify } from "./organization-naming";
import type { OwnerProfile } from "./organization-queries";
import {
  insertOrganization,
  insertOwnerMembership,
} from "./organization-queries";
import { setUpOrganization } from "./set-up-organization";

const SLUG_DISAMBIGUATOR_MAX = 1_000_000;

/**
 * Gives a user signing in for the first time somewhere to work.
 *
 * Better Auth has no hook for this -- its plugin creates organisations on
 * request rather than on sign-up -- so the rows are written here, with its
 * generator rather than ours, because that plugin writes the same two tables
 * whenever someone creates an organisation by hand.
 */
export const provisionPersonalOrganization = (
  db: Database["Type"],
  ids: IdGeneratorShape,
  autumn: AutumnShape,
  userId: string,
  profile: OwnerProfile
) =>
  Effect.gen(function* () {
    const owner = displayName(profile.name, profile.email);
    const id = yield* authId;
    const memberId = yield* authId;
    const disambiguator = yield* Random.nextIntBetween(
      0,
      SLUG_DISAMBIGUATOR_MAX
    );
    const createdAt = new Date(yield* Clock.currentTimeMillis);
    const name = `${owner}'s Org`;

    yield* insertOrganization(db, {
      createdAt,
      id,
      name,
      slug: `${slugify(owner)}-${disambiguator}`,
    });

    yield* insertOwnerMembership(db, {
      createdAt,
      id: memberId,
      organizationId: id,
      userId,
    });

    yield* setUpOrganization(db, ids, autumn, {
      email: profile.email,
      id,
      name,
    });

    return id;
  });
