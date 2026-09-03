import type { Database } from "@anpord/db/client";
import { user } from "@anpord/db/schema/auth/users";
import { credentialConnection } from "@anpord/db/schema/credentials/connections";
import type { Actor } from "@anpord/schema/domain/actor";
import { and, desc, eq, ne } from "drizzle-orm";
import { visibleTo } from "./connection-scope";

type Db = Database["Type"];

export const selectVisible = (db: Db, actor: Actor, id: string) =>
  db
    .select()
    .from(credentialConnection)
    .where(
      and(
        visibleTo(actor.organizationId, actor.id),
        eq(credentialConnection.id, id)
      )
    );

export const selectAllVisible = (db: Db, actor: Actor) =>
  db
    .select()
    .from(credentialConnection)
    .where(visibleTo(actor.organizationId, actor.id))
    .orderBy(desc(credentialConnection.isDefault), credentialConnection.name);

/* Only what `visibleTo` withholds: somebody else's personal rows. An
   organization row is already in the reader's own list, and repeating
   it here would have the page say a teammate has what the reader can
   see they have themselves. */
export const selectPersonalOwners = (db: Db, actor: Actor) =>
  db
    .selectDistinct({
      integrationId: credentialConnection.integrationId,
      owner: user.name,
    })
    .from(credentialConnection)
    .innerJoin(user, eq(user.id, credentialConnection.ownerUserId))
    .where(
      and(
        eq(credentialConnection.organizationId, actor.organizationId),
        eq(credentialConnection.scope, "personal"),
        eq(credentialConnection.status, "active"),
        ne(credentialConnection.ownerUserId, actor.id)
      )
    )
    .orderBy(credentialConnection.integrationId, user.name);

export const selectActive = (
  db: Db,
  actor: Actor,
  integrationId: string,
  connectionId: string | undefined
) =>
  db
    .select()
    .from(credentialConnection)
    .where(
      and(
        visibleTo(actor.organizationId, actor.id),
        eq(credentialConnection.integrationId, integrationId),
        eq(credentialConnection.status, "active"),
        connectionId === undefined
          ? eq(credentialConnection.isDefault, true)
          : eq(credentialConnection.id, connectionId)
      )
    )
    .orderBy(
      desc(credentialConnection.scope),
      desc(credentialConnection.updatedAt)
    )
    .limit(1);

export const selectBound = (
  db: Db,
  organizationId: string,
  connectionId: string
) =>
  db
    .select()
    .from(credentialConnection)
    .where(
      and(
        eq(credentialConnection.id, connectionId),
        eq(credentialConnection.organizationId, organizationId),
        eq(credentialConnection.status, "active")
      )
    )
    .limit(1);
