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
 *
 * The organization comes from the authenticated actor rather than anything a
 * caller sends, which is what keeps one tenant out of another's cache. Nx
 * withdrew their bucket-backed caches over a poisoning attack that a shared
 * store makes possible (CVE-2025-36852); a volume per organization is what
 * stops the same shape here, so this argument must not become one a caller
 * can influence.
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
