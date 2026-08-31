import { createHash } from "node:crypto";
import type { EvalPrepare } from "@anpord/schema/domain/evals";

const LENGTH = 16;

/**
 * The volume a prepare shares with the next run preparing the same way.
 *
 * Scoped to the organization as well as the source, because an organization
 * that configured no sandbox credential runs in the platform's own provider
 * account: two of them writing the same prepare would otherwise name one
 * volume, and whatever the first left behind is what the second builds on.
 */
export const cacheKeyOf = (
  organizationId: string,
  prepare: EvalPrepare | null
) =>
  prepare === null
    ? undefined
    : `anpord-${createHash("sha256")
        .update(organizationId)
        .update("\u0000")
        .update(prepare.source)
        .digest("hex")
        .slice(0, LENGTH)}`;
