import type { Database } from "@anpord/db/client";
import { member } from "@anpord/db/schema/auth/members";
import { organization } from "@anpord/db/schema/auth/organizations";
import { user } from "@anpord/db/schema/auth/users";
import { desc, eq } from "drizzle-orm";
import { Clock, Data, Effect, Option, Random } from "effect";
import { displayName, slugify } from "./organization-naming";

const SLUG_SUFFIX_MAX = 1_000_000;

export class OrganizationStoreError extends Data.TaggedError(
  "OrganizationStoreError"
)<{
  readonly cause: unknown;
  readonly operation: string;
}> {}

/** Random rather than crypto, so a seeded runtime gives stable ids in tests. */
const uuid = Effect.gen(function* () {
  const bytes: string[] = [];
  for (let index = 0; index < 32; index++) {
    const nibble = yield* Random.nextIntBetween(0, 16);
    bytes.push(nibble.toString(16));
  }
  const hex = bytes.join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
});

const query = <A>(operation: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    catch: (cause) => new OrganizationStoreError({ cause, operation }),
    try: run,
  });

const existingMembership = (db: Database["Type"], userId: string) =>
  query("member.findByUser", () =>
    db
      .select({ organizationId: member.organizationId })
      .from(member)
      .where(eq(member.userId, userId))
      .orderBy(desc(member.createdAt))
      .limit(1)
  ).pipe(Effect.map((rows) => Option.fromNullable(rows.at(0))));

const owner = (db: Database["Type"], userId: string) =>
  query("user.findById", () =>
    db
      .select({ email: user.email, name: user.name })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1)
  ).pipe(Effect.map((rows) => Option.fromNullable(rows.at(0))));

const provision = (
  db: Database["Type"],
  userId: string,
  profile: { readonly email: string; readonly name: string | null }
) =>
  Effect.gen(function* () {
    const name = displayName(profile.name, profile.email);
    const organizationId = yield* uuid;
    const memberId = yield* uuid;
    /** Slugs are unique, and two people can share a display name. */
    const suffix = yield* Random.nextIntBetween(0, SLUG_SUFFIX_MAX);
    const now = new Date(yield* Clock.currentTimeMillis);

    yield* query("organization.insert", () =>
      db.insert(organization).values({
        createdAt: now,
        id: organizationId,
        name: `${name}'s Org`,
        slug: `${slugify(name)}-${suffix}`,
      })
    );

    yield* query("member.insert", () =>
      db.insert(member).values({
        createdAt: now,
        id: memberId,
        organizationId,
        role: "owner",
        userId,
      })
    );

    return organizationId;
  });

/**
 * Every session needs an organization: it scopes every query and every write.
 * Resolving it here rather than in the client means API and SDK callers get a
 * usable session too, not just someone who has loaded the dashboard.
 */
export const resolveActiveOrganization = (
  db: Database["Type"],
  userId: string
) =>
  Effect.gen(function* () {
    const membership = yield* existingMembership(db, userId);

    if (Option.isSome(membership)) {
      return Option.some(membership.value.organizationId);
    }

    const profile = yield* owner(db, userId);

    return yield* Option.match(profile, {
      onNone: () => Effect.succeedNone,
      onSome: (found) =>
        provision(db, userId, found).pipe(Effect.map(Option.some)),
    });
  }).pipe(
    Effect.withSpan("Organizations.resolveActive"),
    Effect.annotateLogs({ userId })
  );
