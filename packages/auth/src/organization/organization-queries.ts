import type { Database } from "@anpord/db/client";
import { member } from "@anpord/db/schema/auth/members";
import { organization } from "@anpord/db/schema/auth/organizations";
import { user } from "@anpord/db/schema/auth/users";
import { channel } from "@anpord/db/schema/prompts/channels";
import { and, desc, eq } from "drizzle-orm";
import { Effect, Option } from "effect";
import { OrganizationStoreError } from "./organization-store-error";

type Db = Database["Type"];

export interface OwnerProfile {
  readonly email: string;
  readonly name: string | null;
}

export interface NewOrganization {
  readonly createdAt: Date;
  readonly id: string;
  readonly name: string;
  readonly slug: string;
}

export interface NewOwnerMembership {
  readonly createdAt: Date;
  readonly id: string;
  readonly organizationId: string;
  readonly userId: string;
}

const tryQuery = <A>(operation: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    catch: (cause) => new OrganizationStoreError({ cause, operation }),
    try: run,
  });

const firstRow = <A>(rows: readonly A[]) => Option.fromNullable(rows.at(0));

export const findLatestMembership = (db: Db, userId: string) =>
  tryQuery("member.findByUser", () =>
    db
      .select({ organizationId: member.organizationId })
      .from(member)
      .where(eq(member.userId, userId))
      .orderBy(desc(member.createdAt))
      .limit(1)
  ).pipe(Effect.map(firstRow));

/** Scoped to the organisation as well as the user, because a person can hold a
 * different role in each one and the session names which is active. */
export const findMemberRole = (
  db: Db,
  organizationId: string,
  userId: string
) =>
  tryQuery("member.findRole", () =>
    db
      .select({ role: member.role })
      .from(member)
      .where(
        and(
          eq(member.organizationId, organizationId),
          eq(member.userId, userId)
        )
      )
      .limit(1)
  ).pipe(Effect.map(firstRow));

export const findOwnerProfile = (db: Db, userId: string) =>
  tryQuery("user.findById", () =>
    db
      .select({ email: user.email, name: user.name })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1)
  ).pipe(Effect.map((rows): Option.Option<OwnerProfile> => firstRow(rows)));

export const insertOrganization = (db: Db, values: NewOrganization) =>
  tryQuery("organization.insert", () => db.insert(organization).values(values));

export const insertOwnerMembership = (db: Db, values: NewOwnerMembership) =>
  tryQuery("member.insert", () =>
    db.insert(member).values({ ...values, role: "owner" })
  );

/** The one place a channel is named in code.
 *
 * Every other reader asks which channel an organisation marked default, so
 * this name is a starting point the organisation may rename or point away
 * from rather than a value the product depends on. */
const SEEDED_CHANNEL = { color: "green", name: "production" } as const;

/** Gives a new organisation a channel to answer requests that name none.
 * Without it a bare `get` falls through to the newest version, which publishes
 * every edit the moment it is written. */
export const insertDefaultChannel = (
  db: Db,
  values: {
    readonly createdAt: Date;
    readonly internalId: string;
    readonly organizationId: string;
  }
) =>
  tryQuery("channel.seed", () =>
    db
      .insert(channel)
      .values({
        color: SEEDED_CHANNEL.color,
        createdAt: values.createdAt,
        internalId: values.internalId,
        isDefault: true,
        name: SEEDED_CHANNEL.name,
        organizationId: values.organizationId,
      })
      .onConflictDoNothing()
  );
