import type { Database } from "@anpord/db/client";
import { member } from "@anpord/db/schema/auth/members";
import { organization } from "@anpord/db/schema/auth/organizations";
import { user } from "@anpord/db/schema/auth/users";
import { desc, eq } from "drizzle-orm";
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
