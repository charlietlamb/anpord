import { createHash } from "node:crypto";
import { EvalHarness, EvalProvider } from "@anpord/schema/domain/evals";
import { Schema } from "effect";

export const ProviderName = EvalProvider;
export type ProviderName = typeof ProviderName.Type;

export const HarnessName = EvalHarness;
export type HarnessName = typeof HarnessName.Type;

export const CellKey = Schema.String.pipe(Schema.brand("CellKey"));
export type CellKey = typeof CellKey.Type;

/** What a cell is: one case on one variant. The harness version is not part
 * of it. A new release of the same harness is the change a baseline exists to
 * measure, so it is recorded on each reading and compared, never hashed into
 * the identity. */
export interface CellParts {
  readonly harness: HarnessName;
  readonly model: string;
  readonly provider: ProviderName;
  readonly taskId: string;
  readonly taskVersion: string;
}

/* Joined with a newline rather than NUL so the same key can be recomputed in
   SQL, which is how a migration re-keys stored rows: Postgres text cannot hold
   NUL. None of the parts can contain a newline. */
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
