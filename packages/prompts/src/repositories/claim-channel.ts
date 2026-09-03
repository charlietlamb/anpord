import { channel } from "@anpord/db/schema/prompts/channels";
import { and, eq } from "drizzle-orm";
import type { Tx } from "./query";

/** Publishing to a channel the organisation has not used before creates it, so
 * a move never fails on a missing row. Conflict means another writer got there
 * first, and its row is the one to use. */
export const claimChannel = async (
  tx: Tx,
  values: {
    readonly color: string;
    readonly internalId: string;
    readonly name: string;
    readonly organizationId: string;
  }
) => {
  const [created] = await tx
    .insert(channel)
    .values(values)
    .onConflictDoNothing()
    .returning({ internalId: channel.internalId });

  if (created) {
    return created.internalId;
  }

  const [found] = await tx
    .select({ internalId: channel.internalId })
    .from(channel)
    .where(
      and(
        eq(channel.organizationId, values.organizationId),
        eq(channel.name, values.name)
      )
    )
    .limit(1);

  if (!found) {
    throw new Error(`no channel named ${values.name}`);
  }

  return found.internalId;
};
