import { Data, Schema } from "effect";
import { ProviderName } from "./cell";

/* Bounded so a cyclic cause chain cannot hang the error reporter. */
const CAUSE_DEPTH = 5;

/* Drivers wrap: the readable message sits under two or three layers of `cause`. */
export const reasonOf = (cause: unknown): string => {
  let found = cause;

  for (let depth = 0; depth < CAUSE_DEPTH; depth += 1) {
    if (!(found instanceof Error)) {
      return String(found);
    }

    const inner: unknown = found.cause;

    if (inner === undefined || inner === null) {
      return found.message;
    }

    found = inner;
  }

  return found instanceof Error ? found.message : String(found);
};

export class SandboxUnavailable extends Schema.TaggedError<SandboxUnavailable>(
  "SandboxUnavailable"
)("SandboxUnavailable", {
  provider: ProviderName,
  reason: Schema.String,
}) {}

export const sandboxUnavailable = (
  provider: typeof ProviderName.Type,
  reason: unknown
) => new SandboxUnavailable({ provider, reason: reasonOf(reason) });

export class HarnessUnavailable extends Schema.TaggedError<HarnessUnavailable>(
  "HarnessUnavailable"
)("HarnessUnavailable", {
  harness: Schema.String,
  reason: Schema.String,
}) {}

/* Distinct from SandboxUnavailable: the sandbox is fine, the workspace is not. */
export class SourceUnavailable extends Schema.TaggedError<SourceUnavailable>(
  "SourceUnavailable"
)("SourceUnavailable", {
  reason: Schema.String,
  url: Schema.String,
}) {}

export class PrepareFailed extends Schema.TaggedError<PrepareFailed>(
  "PrepareFailed"
)("PrepareFailed", { name: Schema.String, reason: Schema.String }) {}

/* `message` is overridden because the default renders as "An error has occurred". */
export class EvalStoreError extends Data.TaggedError("EvalStoreError")<{
  readonly cause: unknown;
  readonly operation: string;
}> {
  override get message() {
    return `${this.operation} failed: ${reasonOf(this.cause)}`;
  }
}

/* `message` is overridden because the default renders as "An error has occurred". */
export class NotRunnable extends Data.TaggedError("NotRunnable")<{
  readonly id: string;
  readonly problems: readonly string[];
}> {
  override get message() {
    return `${this.id} cannot run: ${this.problems.join(", ")}`;
  }
}

export class ModelsUnreadable extends Data.TaggedError("ModelsUnreadable")<{
  readonly cause: unknown;
  readonly source: string;
}> {}
