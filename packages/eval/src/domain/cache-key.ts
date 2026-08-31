import { createHash } from "node:crypto";
import type { EvalPrepare } from "@anpord/schema/domain/evals";

const LENGTH = 16;

export const cacheKeyOf = (prepare: EvalPrepare | null) =>
  prepare === null
    ? undefined
    : `anpord-${createHash("sha256").update(prepare.source).digest("hex").slice(0, LENGTH)}`;
