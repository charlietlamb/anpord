import { EvalBatch } from "@anpord/schema/domain/evals";
import type { FileSystem } from "@effect/platform";
import { type Effect, Schema } from "effect";

export const SuiteOutcome = Schema.Struct({
  batch: Schema.NullOr(EvalBatch),
  batchId: Schema.NullOr(Schema.String),
  error: Schema.NullOr(Schema.String),
  file: Schema.NullOr(Schema.String),
  problems: Schema.Array(Schema.String),
  suite: Schema.NullOr(Schema.String),
});
export type SuiteOutcome = typeof SuiteOutcome.Type;

export const outcomeLabel = (outcome: SuiteOutcome) =>
  outcome.file ?? outcome.suite ?? outcome.batchId ?? "eval";

export type SaveOutcome = (
  outcome: SuiteOutcome
) => Effect.Effect<void, never, FileSystem.FileSystem>;
