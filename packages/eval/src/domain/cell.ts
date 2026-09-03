import { createHash } from "node:crypto";
import { EvalHarness, EvalProvider } from "@anpord/schema/domain/evals";
import { Schema } from "effect";

export const ProviderName = EvalProvider;
export type ProviderName = typeof ProviderName.Type;

export const HarnessName = EvalHarness;
export type HarnessName = typeof HarnessName.Type;

export const CellKey = Schema.String.pipe(Schema.brand("CellKey"));
export type CellKey = typeof CellKey.Type;

/* The harness version is compared across readings, never part of the key. */
export interface CellParts {
  readonly harness: HarnessName;
  readonly model: string;
  readonly provider: ProviderName;
  readonly taskId: string;
  readonly taskVersion: string;
}

/* Newline-joined so SQL can recompute it: Postgres text cannot hold NUL. */
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
        ].join("\n")
      )
      .digest("hex")
      .slice(0, 32)
  );
