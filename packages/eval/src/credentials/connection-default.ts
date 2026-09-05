import type { Database } from "@anpord/db/client";
import { credentialConnection } from "@anpord/db/schema/credentials/connections";
import { and, eq } from "drizzle-orm";
import { defaultScope } from "./connection-scope";

type Db = Database["Type"];

interface Owner {
  readonly id: string;
  readonly organizationId: string;
}

export type NewConnection = Omit<
  typeof credentialConnection.$inferInsert,
  "isDefault"
>;

/** The first connection for an integration and scope is the default unasked. */
export const insertClaimingDefault = (
  db: Db,
  actor: Owner,
  row: NewConnection,
  wantsDefault: boolean
) =>
  db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: credentialConnection.id })
      .from(credentialConnection)
      .where(
        defaultScope(
          actor.organizationId,
          actor.id,
          row.integrationId,
          row.scope
        )
      )
      .limit(1);
    const isDefault = wantsDefault || existing.length === 0;

    if (isDefault) {
      await tx
        .update(credentialConnection)
        .set({ isDefault: false })
        .where(
          defaultScope(
            actor.organizationId,
            actor.id,
            row.integrationId,
            row.scope
          )
        );
    }
    return tx
      .insert(credentialConnection)
      .values({ ...row, isDefault })
      .returning();
  });

export const promoteToDefault = (
  db: Db,
  actor: Owner,
  selected: {
    readonly id: string;
    readonly integrationId: string;
    readonly scope: string;
  },
  now: Date
) =>
  db.transaction(async (tx) => {
    await tx
      .update(credentialConnection)
      .set({ isDefault: false })
      .where(
        defaultScope(
          actor.organizationId,
          actor.id,
          selected.integrationId,
          selected.scope
        )
      );
    /* The clearing statement above is scoped and this one was not, so the two
       halves of one promotion disagreed about which rows they could reach. */
    return tx
      .update(credentialConnection)
      .set({ isDefault: true, updatedAt: now })
      .where(
        and(
          eq(credentialConnection.organizationId, actor.organizationId),
          eq(credentialConnection.id, selected.id)
        )
      )
      .returning();
  });
