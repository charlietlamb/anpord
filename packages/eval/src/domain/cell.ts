import { createHash } from "node:crypto";
import { EvalHarness, EvalProvider } from "@anpord/schema/domain/evals";
import { Schema } from "effect";

export const ProviderName = EvalProvider;
export type ProviderName = typeof ProviderName.Type;

export const HarnessName = EvalHarness;
export type HarnessName = typeof HarnessName.Type;

export const CellKey = Schema.String.pipe(Schema.brand("CellKey"));
export type CellKey = typeof CellKey.Type;

/* The harness version and the profile version are compared across readings,
   never part of the key. The profile name is. */
export interface CellParts {
  readonly harness: HarnessName;
  readonly model: string;
  readonly profile: string | null;
  readonly provider: ProviderName;
  readonly taskId: string;
  readonly taskVersion: string;
}

/* Newline-joined so SQL can recompute it: Postgres text cannot hold NUL. The
   profile name is a sixth part only when there is one, so every key from
   before profiles existed is byte-identical. */
export const cellKeyOf = (parts: CellParts): CellKey =>
  CellKey.make(
    createHash("sha256")
      .update(
        [
          parts.taskId,
          parts.taskVersion,
          parts.harness,
          parts.model,
          parts.provider,
          ...(parts.profile === null ? [] : [parts.profile]),
        ].join("\n")
      )
      .digest("hex")
      .slice(0, 32)
  );
