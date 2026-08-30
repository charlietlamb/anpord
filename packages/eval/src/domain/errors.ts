import { Data, Schema } from "effect";
import { ProviderName } from "./cell";

/** How deep to follow `cause` before giving up, so a cycle cannot hang the
 * thing that is meant to explain a failure. */
const CAUSE_DEPTH = 5;

/**
 * The innermost reason an error carries.
 *
 * Drivers wrap: the message worth reading sits under two or three layers of
 * `cause`, and the outermost one says only that a query failed. Following the
 * chain is what turns "Failed query: insert into eval_trial" into "cannot use
 * a pool after calling end on the pool".
 */
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

export class HarnessUnavailable extends Schema.TaggedError<HarnessUnavailable>(
  "HarnessUnavailable"
)("HarnessUnavailable", {
  harness: Schema.String,
  reason: Schema.String,
}) {}

/**
 * The workspace a case named could not be read.
 *
 * Distinct from SandboxUnavailable: the sandbox started and did as it was
 * asked. Reporting a repository nobody can clone as a provider outage sends
 * the reader to a status page over what is usually a URL, a ref, or an
 * installation that does not cover the repository.
 */
export class SourceUnavailable extends Schema.TaggedError<SourceUnavailable>(
  "SourceUnavailable"
)("SourceUnavailable", {
  reason: Schema.String,
  url: Schema.String,
}) {}

/**
 * A store operation that did not complete.
 *
 * `message` is overridden because the default renders every one of these as
 * "An error has occurred": the operation and the driver's own reason are both
 * carried and neither was ever printed, so a failed run said only that it had
 * failed. Finding that a pool had been closed under a running trial took four
 * runs and a script written to squash the cause by hand.
 */
export class EvalStoreError extends Data.TaggedError("EvalStoreError")<{
  readonly cause: unknown;
  readonly operation: string;
}> {
  override get message() {
    return `${this.operation} failed: ${reasonOf(this.cause)}`;
  }
}

export class NotRunnable extends Data.TaggedError("NotRunnable")<{
  readonly id: string;
  readonly problems: readonly string[];
}> {}

export class UnreadableHarness extends Data.TaggedError("UnreadableHarness")<{
  readonly spec: string;
}> {}

export class ModelsUnreadable extends Data.TaggedError("ModelsUnreadable")<{
  readonly cause: unknown;
  readonly source: string;
}> {}
