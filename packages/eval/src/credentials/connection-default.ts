import type { Db } from "@sphynx/db/query";
import { credentialConnection } from "@sphynx/db/schema/credentials/connections";
import { defaultScope } from "./connection-scope";

interface Owner {
  readonly id: string;
  readonly organizationId: string;
}

export type NewConnection = Omit<
  typeof credentialConnection.$inferInsert,
  "isDefault"
>;

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
