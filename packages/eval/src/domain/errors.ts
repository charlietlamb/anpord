import { Data, Schema } from "effect";
import { ProviderName } from "./cell";

/**
 * The retry boundary, expressed as a type rather than as a flag.
 *
 * `SandboxUnavailable` is infrastructure, so it is retried. A result is not:
 * retrying a trial that already told us something turns a pass rate into
 * fiction. Voiding is carried as data on the outcome rather than as an error,
 * because a trial that produced no evidence still produced a row.
 */
export class SandboxUnavailable extends Schema.TaggedError<SandboxUnavailable>(
  "SandboxUnavailable"
)("SandboxUnavailable", {
  provider: ProviderName,
  reason: Schema.String,
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

/** A cell that cannot serve as a reference. Refusing at promotion is the last
 * cheap moment: a promoted void is read as a measured zero by every later
 * comparison and reports a collapse that never happened. */
export class VoidBaseline extends Data.TaggedError("VoidBaseline")<{
  readonly cellInternalId: string;
  readonly reason: string;
}> {}

/** A playground asked to run before it can. Carries every reason at once,
 * because fixing one and being told about the next is a worse experience
 * than being told all of them now. */
export class NotRunnable extends Data.TaggedError("NotRunnable")<{
  readonly id: string;
  readonly problems: readonly string[];
}> {}

/** A harness spec that names no version, or no harness. Refused before a
 * sandbox opens: a typo should cost an error, not a run. */
export class UnreadableHarness extends Data.TaggedError("UnreadableHarness")<{
  readonly spec: string;
}> {}
