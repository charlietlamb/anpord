import { Database } from "@anpord/db/client";
import { member } from "@anpord/db/schema/auth/members";
import { organization } from "@anpord/db/schema/auth/organizations";
import { user } from "@anpord/db/schema/auth/users";
import { IdGenerator } from "@anpord/ids/id";
import { desc, eq } from "drizzle-orm";
import { Clock, Context, Data, Effect, Layer, Option, Random } from "effect";
import { displayName, slugify } from "./organization-naming";

const SLUG_DISAMBIGUATOR_MAX = 1_000_000;

export class OrganizationStoreError extends Data.TaggedError(
  "OrganizationStoreError"
)<{
  readonly cause: unknown;
  readonly operation: string;
}> {}

export interface OrganizationStoreShape {
  readonly resolveActive: (
    userId: string
  ) => Effect.Effect<Option.Option<string>, OrganizationStoreError>;
}

export class OrganizationStore extends Context.Tag(
  "@anpord/auth/OrganizationStore"
)<OrganizationStore, OrganizationStoreShape>() {}

const make = Effect.gen(function* () {
  const db = yield* Database;
  const ids = yield* IdGenerator;

  const tryStore = <A>(operation: string, run: () => Promise<A>) =>
    Effect.tryPromise({
      catch: (cause) => new OrganizationStoreError({ cause, operation }),
      try: run,
    });

  const firstRow = <A>(rows: readonly A[]) => Option.fromNullable(rows.at(0));

  const existingMembership = (userId: string) =>
    tryStore("member.findByUser", () =>
      db
        .select({ organizationId: member.organizationId })
        .from(member)
        .where(eq(member.userId, userId))
        .orderBy(desc(member.createdAt))
        .limit(1)
    ).pipe(Effect.map(firstRow));

  const ownerProfile = (userId: string) =>
    tryStore("user.findById", () =>
      db
        .select({ email: user.email, name: user.name })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1)
    ).pipe(Effect.map(firstRow));

  const provisionPersonalOrganization = (
    userId: string,
    profile: { readonly email: string; readonly name: string | null }
  ) =>
    Effect.gen(function* () {
      const name = displayName(profile.name, profile.email);
      const organizationId = yield* ids.generate("organization");
      const memberId = yield* ids.generate("member");
      const disambiguator = yield* Random.nextIntBetween(
        0,
        SLUG_DISAMBIGUATOR_MAX
      );
      const now = new Date(yield* Clock.currentTimeMillis);

      yield* tryStore("organization.insert", () =>
        db.insert(organization).values({
          createdAt: now,
          id: organizationId,
          name: `${name}'s Org`,
          slug: `${slugify(name)}-${disambiguator}`,
        })
      );

      yield* tryStore("member.insert", () =>
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

  const resolveActive = (userId: string) =>
    Effect.gen(function* () {
      const membership = yield* existingMembership(userId);

      if (Option.isSome(membership)) {
        return Option.some(membership.value.organizationId);
      }

      const profile = yield* ownerProfile(userId);

      return yield* Option.match(profile, {
        onNone: () => Effect.succeedNone,
        onSome: (found) =>
          provisionPersonalOrganization(userId, found).pipe(
            Effect.map(Option.some)
          ),
      });
    }).pipe(
      Effect.withSpan("OrganizationStore.resolveActive"),
      Effect.annotateLogs({ userId })
    );

  return OrganizationStore.of({ resolveActive });
});

export const OrganizationStoreLive = Layer.effect(OrganizationStore, make);
