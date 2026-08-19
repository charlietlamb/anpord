import { Data, Schema } from "effect";
import { ProviderName } from "./cell";

/**
 * The retry boundary, expressed as types rather than as a flag.
 *
 * `SandboxUnavailable` is infrastructure and is retried. `TrialVoided` and
 * `CeilingExceeded` are results and are never retried, because retrying a
 * trial that already told us something turns a pass rate into fiction. A
 * single shared error would have erased that distinction at the one place it
 * has to hold.
 *
 * These are `Schema.TaggedError` rather than `Data.TaggedError` because the
 * workflow engine encodes an activity's error to durable storage, and a `Data`
 * error does not typecheck where a Schema is required.
 */
export class SandboxUnavailable extends Schema.TaggedError<SandboxUnavailable>(
  "SandboxUnavailable"
)("SandboxUnavailable", {
  provider: ProviderName,
  reason: Schema.String,
}) {}

export class TrialVoided extends Schema.TaggedError<TrialVoided>("TrialVoided")(
  "TrialVoided",
  { fields: Schema.Array(Schema.String) }
) {}

export class CeilingExceeded extends Schema.TaggedError<CeilingExceeded>(
  "CeilingExceeded"
)("CeilingExceeded", {
  ceilingCents: Schema.Int,
  spentCents: Schema.Int,
}) {}

export class HarnessUnavailable extends Schema.TaggedError<HarnessUnavailable>(
  "HarnessUnavailable"
)("HarnessUnavailable", {
  harness: Schema.String,
  reason: Schema.String,
}) {}

/** Failures that never cross the workflow boundary stay `Data.TaggedError`,
 * matching the domain convention in `packages/prompts`. */
export class EvalStoreError extends Data.TaggedError("EvalStoreError")<{
  readonly cause: unknown;
  readonly operation: string;
}> {}

export class TaskNotFound extends Data.TaggedError("TaskNotFound")<{
  readonly id: string;
}> {}

export class RunNotFound extends Data.TaggedError("RunNotFound")<{
  readonly id: string;
}> {}

export type EvalError = EvalStoreError | RunNotFound | TaskNotFound;
