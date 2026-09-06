import { createHash } from "node:crypto";
import type { EvalPrepare } from "@anpord/schema/domain/evals";

const LENGTH = 16;

/* organizationId must come from the authenticated actor, never a caller: a shared
   cache store is poisonable across tenants (Nx, CVE-2025-36852). */
/* The bundler writes each source path into the output as a comment, so the same
   prepare compiled from another directory would otherwise never hit. */
const COMMENTED_PATH = /^\s*\/\/.*$/gm;

const meaningOf = (source: string) => source.replace(COMMENTED_PATH, "");

export const cacheKeyOf = (
  organizationId: string,
  prepare: EvalPrepare | null
) =>
  prepare === null
    ? undefined
    : `anpord-${createHash("sha256")
        .update(organizationId)
        .update("\u0000")
        .update(meaningOf(prepare.source))
        .digest("hex")
        .slice(0, LENGTH)}`;
